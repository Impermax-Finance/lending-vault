pragma solidity =0.5.16;
pragma experimental ABIEncoderV2;

import "./SafeMath.sol";
import "./Math.sol";
import "../interfaces/IBorrowable.sol";


library BorrowableObject {
	using SafeMath for uint;
	using BorrowableObject for Borrowable;

	struct Borrowable {
		IBorrowable borrowableContract;
		uint exchangeRate;
		uint totalBorrows;       // in underlyings
		uint externalSupply;     // in underlyings
		uint initialOwnedSupply; // in underlyings
		uint ownedSupply;        // in underlyings
		uint kinkBorrowRate;
		uint kinkUtilizationRate;
		uint reserveFactor;
		uint kinkMultiplier;
		uint cachedSupplyRate;
	}

	function newBorrowable(IBorrowable borrowableContract, address lendingVault) internal returns (Borrowable memory borrowable) {
		borrowableContract.sync();
		uint exchangeRate = borrowableContract.exchangeRate();
		uint totalSupplyInTokens = borrowableContract.totalSupply();
		uint ownedSupplyInTokens = borrowableContract.balanceOf(lendingVault);
		uint externalSupplyInTokens = totalSupplyInTokens.sub(ownedSupplyInTokens);
		borrowable = Borrowable({
			borrowableContract: borrowableContract,
			exchangeRate: exchangeRate,
			totalBorrows: borrowableContract.totalBorrows(),
			externalSupply: externalSupplyInTokens.mul(exchangeRate).div(1e18),
			initialOwnedSupply: ownedSupplyInTokens.mul(exchangeRate).div(1e18),
			ownedSupply: ownedSupplyInTokens.mul(exchangeRate).div(1e18),
			kinkBorrowRate: borrowableContract.kinkBorrowRate(),
			kinkUtilizationRate: borrowableContract.kinkUtilizationRate(),
			reserveFactor: borrowableContract.reserveFactor(),
			kinkMultiplier: borrowableContract.KINK_MULTIPLIER(),
			cachedSupplyRate: 0
		});
		borrowable.cachedSupplyRate = supplyRate(borrowable);
		return borrowable;
	}

	function totalSupply(Borrowable memory borrowable) internal pure returns (uint) {
		return borrowable.externalSupply.add(borrowable.ownedSupply);
	}

	function utilizationRate(Borrowable memory borrowable) internal pure returns (uint) {
		uint _totalSupply = totalSupply(borrowable);
		if (_totalSupply == 0) return 0;
		return borrowable.totalBorrows.mul(1e18).div(_totalSupply);
	}

	function kinkRate(Borrowable memory borrowable) internal pure returns (uint) {
		return borrowable.kinkUtilizationRate
			.mul(borrowable.kinkBorrowRate).div(1e18)
			.mul(uint(1e18).sub(borrowable.reserveFactor)).div(1e18);
	}

	function supplyRate(Borrowable memory borrowable) internal pure returns (uint rate) {
		uint utilizationRate_ = utilizationRate(borrowable);
		uint ratio = utilizationRate_.mul(1e18).div(borrowable.kinkUtilizationRate);
		uint borrowFactor; //borrowRate to kinkBorrowRate ratio
		if (utilizationRate_ < borrowable.kinkUtilizationRate) {
			borrowFactor = ratio;
		} else {
			uint excessRatio = utilizationRate_.sub(borrowable.kinkUtilizationRate)
				.mul(1e18).div(uint(1e18).sub(borrowable.kinkUtilizationRate));
			borrowFactor = excessRatio.mul(borrowable.kinkMultiplier.sub(1)).add(1e18);
		}
		rate = borrowFactor.mul(kinkRate(borrowable)).div(1e18).mul(ratio).div(1e18);
	}

	function allocate(Borrowable memory borrowable, uint amount) internal pure returns (Borrowable memory) {
		borrowable.ownedSupply = borrowable.ownedSupply.add(amount);
		borrowable.cachedSupplyRate = supplyRate(borrowable);
		return borrowable;
	}

	function deallocate(Borrowable memory borrowable, uint amount) internal pure returns (Borrowable memory) {
		uint availableLiquidity = totalSupply(borrowable).sub(borrowable.totalBorrows, "ERROR: NEGATIVE AVAILABLE LIQUIDITY");
		require(amount <= availableLiquidity, "ERROR: DEALLOCATE AMOUNT > AVAILABLE LIQUIDITY");
		borrowable.ownedSupply = borrowable.ownedSupply.sub(amount);
		borrowable.cachedSupplyRate = supplyRate(borrowable);
		return borrowable;
	}

	function deallocateMax(Borrowable memory borrowable) internal pure returns (Borrowable memory, uint) {
		if (totalSupply(borrowable) < borrowable.totalBorrows) return (borrowable, 0);
		uint availableLiquidity = totalSupply(borrowable).sub(borrowable.totalBorrows);
		uint amount = Math.min(borrowable.ownedSupply, availableLiquidity);
		return (deallocate(borrowable, amount), amount);
	}

	function calculateUtilizationForRate(Borrowable memory borrowable, uint rate) internal pure returns (uint targetUtilizationRate) {
		if (rate <= kinkRate(borrowable)) {
			targetUtilizationRate = Math.sqrt(
				rate.mul(1e18).div(kinkRate(borrowable)).mul(1e18)
			).mul(borrowable.kinkUtilizationRate).div(1e18);
		} else {
			uint a = borrowable.kinkMultiplier.sub(1);
			uint b = borrowable.kinkUtilizationRate.mul(borrowable.kinkMultiplier).sub(1e18);
			uint c = rate.mul(borrowable.kinkUtilizationRate).div(1e18)
				.mul(uint(1e18).sub(borrowable.kinkUtilizationRate)).div(kinkRate(borrowable));
			uint tmp = Math.sqrt(
				b.mul(b).div(1e18).add(a.mul(c).mul(4)).mul(1e18)
			);
			targetUtilizationRate = tmp.add(b).div(a).div(2);
		}
	}

	function calculateAmountForRate(Borrowable memory borrowable, uint rate) internal pure returns (uint) {
		require(rate > 0, "ERROR: rate = 0");
		require(rate <= borrowable.cachedSupplyRate, "ERROR: TARGET RATE > CACHED RATE");
		uint targetUtilizationRate = calculateUtilizationForRate(borrowable, rate);
		uint targetSupply = borrowable.totalBorrows.mul(1e18).div(targetUtilizationRate);
		if (targetSupply < totalSupply(borrowable)) {
			// catch any edge scenarios...
			return 0;
		}
		return targetSupply.sub(totalSupply(borrowable));
	}

	function compare(Borrowable memory borrowableA, Borrowable memory borrowableB) internal pure returns (bool) {
		return borrowableA.cachedSupplyRate > borrowableB.cachedSupplyRate;
	}
}