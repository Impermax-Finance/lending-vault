pragma solidity =0.5.16;

import "../LendingVaultV1.sol";
import "../interfaces/IBorrowable.sol";
import "../libraries/BorrowableHelpers.sol";

contract LendingVaultV1Harness is LendingVaultV1 {
	
	function allocate(IBorrowable borrowable, uint mintAmount) external returns (uint mintTokens) {
		return _allocate(borrowable, mintAmount);
	}

	function deallocate(IBorrowable borrowable, uint redeemTokens) external returns (uint redeemAmount) {
		return _deallocate(borrowable, redeemTokens);
	}

	function tokensForAtMost(uint redeemAmount, uint _exchangeRate) external pure returns (uint redeemTokens) {
		return BorrowableHelpers.tokensForAtMost(redeemAmount, _exchangeRate);
	}

	function tokensForAtLeast(uint redeemAmount, uint _exchangeRate) external pure returns (uint redeemTokens) {
		return BorrowableHelpers.tokensForAtLeast(redeemAmount, _exchangeRate);
	}
	
	function _getBorrowableInfo(BorrowableObject.Borrowable memory borrowable) internal pure returns (
		uint externalSupply,
		uint initialOwnedSupply,
		uint ownedSupply,
		uint totalSupply,
		uint utilizationRate,
		uint kinkAPR,
		uint cachedSupplyAPR
	) {
		externalSupply = borrowable.externalSupply;
		initialOwnedSupply = borrowable.initialOwnedSupply;
		ownedSupply = borrowable.ownedSupply;
		totalSupply = borrowable.totalSupply();
		utilizationRate = borrowable.utilizationRate();
		kinkAPR = borrowable.kinkAPR();
		cachedSupplyAPR = borrowable.cachedSupplyAPR;
	}
	
	function getBorrowableInfo(address borrowable) external returns (
		uint externalSupply,
		uint initialOwnedSupply,
		uint ownedSupply,
		uint totalSupply,
		uint utilizationRate,
		uint kinkAPR,
		uint cachedSupplyAPR
	) {
		BorrowableObject.Borrowable memory borrowableObj = BorrowableObject.newBorrowable(IBorrowable(borrowable));
		(
			externalSupply,
			initialOwnedSupply,
			ownedSupply,
			totalSupply,
			utilizationRate,
			kinkAPR,
			cachedSupplyAPR
		) = _getBorrowableInfo(borrowableObj);
	}
	
	function getAmountForAPR(address borrowable, uint APR) external returns (uint amount) {
		BorrowableObject.Borrowable memory borrowableObj = BorrowableObject.newBorrowable(IBorrowable(borrowable));
		return borrowableObj.calculateAmountForAPR(APR);
	}
	
	function testAllocate(address borrowable, uint amount) external returns (
		uint externalSupply,
		uint initialOwnedSupply,
		uint ownedSupply,
		uint totalSupply,
		uint utilizationRate,
		uint kinkAPR,
		uint cachedSupplyAPR
	) {
		BorrowableObject.Borrowable memory borrowableObj = BorrowableObject.newBorrowable(IBorrowable(borrowable));
		borrowableObj = borrowableObj.allocate(amount);
		(
			externalSupply,
			initialOwnedSupply,
			ownedSupply,
			totalSupply,
			utilizationRate,
			kinkAPR,
			cachedSupplyAPR
		) = _getBorrowableInfo(borrowableObj);
	}
	
	function testDeallocate(address borrowable, uint amount) external returns (
		uint externalSupply,
		uint initialOwnedSupply,
		uint ownedSupply,
		uint totalSupply,
		uint utilizationRate,
		uint kinkAPR,
		uint cachedSupplyAPR
	) {
		BorrowableObject.Borrowable memory borrowableObj = BorrowableObject.newBorrowable(IBorrowable(borrowable));
		borrowableObj = borrowableObj.deallocate(amount);
		(
			externalSupply,
			initialOwnedSupply,
			ownedSupply,
			totalSupply,
			utilizationRate,
			kinkAPR,
			cachedSupplyAPR
		) = _getBorrowableInfo(borrowableObj);
	}
	
	function testDeallocateMax(address borrowable) external returns (
		uint externalSupply,
		uint initialOwnedSupply,
		uint ownedSupply,
		uint totalSupply,
		uint utilizationRate,
		uint kinkAPR,
		uint cachedSupplyAPR,
		uint amount
	) {
		BorrowableObject.Borrowable memory borrowableObj = BorrowableObject.newBorrowable(IBorrowable(borrowable));
		(borrowableObj, amount) = borrowableObj.deallocateMax();
		(
			externalSupply,
			initialOwnedSupply,
			ownedSupply,
			totalSupply,
			utilizationRate,
			kinkAPR,
			cachedSupplyAPR
		) = _getBorrowableInfo(borrowableObj);
	}

}