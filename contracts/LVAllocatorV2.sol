pragma solidity =0.5.16;

import "./PoolToken.sol";
import "./LVStorageV2.sol";
import "./interfaces/ILendingVaultV2.sol";
import "./libraries/BorrowableHelpers.sol";
import "./libraries/BorrowableObject.sol";

contract LVAllocatorV2 is ILendingVaultV2, PoolToken, LVStorageV2 {
	using BorrowableHelpers for address;
	using BorrowableObject for BorrowableObject.Borrowable;
	
	function _allocate(IBorrowable borrowable, uint mintAmount, uint _exchangeRate) internal returns (uint mintTokens) {
		mintTokens = mintAmount.mul(1e18).div(_exchangeRate);
		if (mintTokens == 0) return 0;
		underlying.safeTransfer(address(borrowable), mintAmount);
		mintTokens = borrowable.mint(address(this));

		emit AllocateIntoBorrowable(address(borrowable), mintAmount, mintTokens);
	}
	function _allocate(IBorrowable borrowable, uint mintAmount) internal returns (uint mintTokens) {
		mintTokens = _allocate(borrowable, mintAmount, borrowable.exchangeRate());
	}

	function _deallocate(IBorrowable borrowable, uint redeemTokens, uint _exchangeRate) internal returns (uint redeemAmount) {
		redeemAmount = redeemTokens.mul(_exchangeRate).div(1e18);
		if (redeemAmount == 0) return 0;
		uint totalBalance = borrowable.totalBalance();
		if (redeemAmount > totalBalance) {
			redeemTokens = totalBalance.mul(1e18).div(_exchangeRate);
		}
		address(borrowable).safeTransfer(address(borrowable), redeemTokens);
		redeemAmount = borrowable.redeem(address(this));

		emit DeallocateFromBorrowable(address(borrowable), redeemAmount, redeemTokens);
	}
	function _deallocate(IBorrowable borrowable, uint redeemTokens) internal returns (uint redeemAmount) {
		redeemAmount = _deallocate(borrowable, redeemTokens, borrowable.exchangeRate());
	}
	
	function _deallocateAtLeastOrMax(IBorrowable borrowable, uint redeemAmount, uint _exchangeRate) internal returns (uint actualRedeemAmount) {
		actualRedeemAmount = _deallocate(IBorrowable(borrowable), BorrowableHelpers.tokensForAtLeast(redeemAmount, _exchangeRate), _exchangeRate);
	}
	function _deallocateAtLeastOrMax(IBorrowable borrowable, uint redeemAmount) internal returns (uint actualRedeemAmount) {
		actualRedeemAmount = _deallocateAtLeastOrMax(borrowable, redeemAmount, borrowable.exchangeRate());
	}

	function _withdrawAndReallocate(uint withdrawAmount) internal {
		// initialize borrowablesObj
		BorrowableObject.Borrowable[] memory borrowablesObj = new BorrowableObject.Borrowable[](borrowables.length);
		uint borrowablesLength = borrowables.length;
		for(uint i = 0; i < borrowables.length; i++) {
			if (!borrowableInfo[borrowables[i]].enabled) {
				borrowablesLength--;
				continue;
			}
			uint delta = uint(borrowables.length).sub(borrowablesLength);
			borrowablesObj[i - delta] = BorrowableObject.newBorrowable(IBorrowable(borrowables[i]), address(this));
		}
		
		// deallocate everything
		uint amountToAllocate = underlying.myBalance();
		for(uint i = 0; i < borrowablesLength; i++) {
			uint amount;
			(borrowablesObj[i], amount) = borrowablesObj[i].deallocateMax();
			amountToAllocate = amountToAllocate.add(amount);
		}
		amountToAllocate = amountToAllocate.sub(withdrawAmount, "LendingVaultV2: INSUFFICIENT_LIQUIDITY");
		if (borrowablesLength == 0) return;
		
		// bubblesort borrowablesObj
		for (uint i = 0; i < borrowablesLength - 1; i++) {
			for (uint j = 0; j < borrowablesLength - 1 - i; j++) {
				if (!borrowablesObj[j].compare(borrowablesObj[j+1])) {
					BorrowableObject.Borrowable memory tmp = borrowablesObj[j];
					borrowablesObj[j] = borrowablesObj[j+1];
					borrowablesObj[j+1] = tmp;
				}
			}
		}

		// Allocate in the pool with the highest APR an amount such that the next APR matches the one
		// of the pool with the second highest APR.
		// Repeat until all the pools with the highest APR have the same APR.
		uint lastCycle = borrowablesLength;
		for(uint i = 1; i < borrowablesLength; i++) {
			uint targetRate = borrowablesObj[i].cachedSupplyRate;
			uint amountThisCycle = 0;
			uint[] memory amounts = new uint[](i);
			if (targetRate == 0) {
				// Unachievable APR
				lastCycle = i;
				break;
			}
			for (uint j = 0; j < i; j++) {
				if (borrowablesObj[j].cachedSupplyRate <= targetRate) break;
				amounts[j] = borrowablesObj[j].calculateAmountForRate(targetRate);
				amountThisCycle = amountThisCycle.add(amounts[j]);
			}
			if (amountThisCycle > amountToAllocate) {
				// We can't afford to complete this cycle
				lastCycle = i;
				break;
			}
			for (uint j = 0; j < i; j++) {
				if (amounts[j] == 0) continue;
				borrowablesObj[j] = borrowablesObj[j].allocate(amounts[j]);
				amountToAllocate = amountToAllocate.sub(amounts[j]);
			}
		}

		// distribute the amount left equally among pools with highest APR proportionally to their total supply
		uint globalTotalSupply = 0;
		uint totalAmountToAllocate = amountToAllocate;
		for (uint i = 0; i < lastCycle; i++) {
			globalTotalSupply = globalTotalSupply.add(borrowablesObj[i].totalSupply());
		}
		for (uint i = 0; i < lastCycle; i++) {
			uint amount = globalTotalSupply > 0 
				? borrowablesObj[i].totalSupply().mul(totalAmountToAllocate).div(globalTotalSupply)
				: amountToAllocate;
			if (amount > amountToAllocate) amount = amountToAllocate;
			borrowablesObj[i] = borrowablesObj[i].allocate(amount);
			amountToAllocate = amountToAllocate.sub(amount);
		}
		
		// redeem
		for(uint i = 0; i < borrowablesLength; i++) {
			if (borrowablesObj[i].ownedSupply < borrowablesObj[i].initialOwnedSupply) {
				uint redeemAmount = borrowablesObj[i].initialOwnedSupply.sub(borrowablesObj[i].ownedSupply);
				_deallocateAtLeastOrMax(borrowablesObj[i].borrowableContract, redeemAmount, borrowablesObj[i].exchangeRate);
			}
		}
		// mint
		amountToAllocate = underlying.myBalance().sub(withdrawAmount, "LendingVaultV2: NEGATIVE AMOUNT TO ALLOCATE");
		for(uint i = 0; i < borrowablesLength; i++) {
			if (borrowablesObj[i].ownedSupply > borrowablesObj[i].initialOwnedSupply) {
				uint mintAmount = borrowablesObj[i].ownedSupply.sub(borrowablesObj[i].initialOwnedSupply);
				if (mintAmount > amountToAllocate) mintAmount = amountToAllocate;
				amountToAllocate = amountToAllocate.sub(mintAmount);
				_allocate(borrowablesObj[i].borrowableContract, mintAmount, borrowablesObj[i].exchangeRate);
			}
		}
	}
}