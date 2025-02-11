pragma solidity =0.5.16;

import "../LendingVaultV2.sol";
import "../interfaces/IBorrowable.sol";
import "../libraries/BorrowableHelpers.sol";

contract LendingVaultV2Harness is LendingVaultV2 {

	function _setFactory(address newFactory) external {
		factory = newFactory;
	}
	
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

	function getTotalSupplied() external returns (uint totalSupplied) {
		return _getTotalSupplied();
	}
	
	function _getBorrowableInfo(BorrowableObject.Borrowable memory borrowable) internal pure returns (
		uint externalSupply,
		uint initialOwnedSupply,
		uint ownedSupply,
		uint totalSupply,
		uint utilizationRate,
		uint kinkRate,
		uint cachedSupplyRate
	) {
		externalSupply = borrowable.externalSupply;
		initialOwnedSupply = borrowable.initialOwnedSupply;
		ownedSupply = borrowable.ownedSupply;
		totalSupply = borrowable.totalSupply();
		utilizationRate = borrowable.utilizationRate();
		kinkRate = borrowable.kinkRate();
		cachedSupplyRate = borrowable.cachedSupplyRate;
	}
	
	function getBorrowableInfo(address borrowable) external returns (
		uint externalSupply,
		uint initialOwnedSupply,
		uint ownedSupply,
		uint totalSupply,
		uint utilizationRate,
		uint kinkRate,
		uint cachedSupplyRate
	) {
		BorrowableObject.Borrowable memory borrowableObj = BorrowableObject.newBorrowable(IBorrowable(borrowable), address(this));
		(
			externalSupply,
			initialOwnedSupply,
			ownedSupply,
			totalSupply,
			utilizationRate,
			kinkRate,
			cachedSupplyRate
		) = _getBorrowableInfo(borrowableObj);
	}
	
	function getAmountForRate(address borrowable, uint Rate) external returns (uint amount) {
		BorrowableObject.Borrowable memory borrowableObj = BorrowableObject.newBorrowable(IBorrowable(borrowable), address(this));
		return borrowableObj.calculateAmountForRate(Rate);
	}
	
	function testAllocate(address borrowable, uint amount) external returns (
		uint externalSupply,
		uint initialOwnedSupply,
		uint ownedSupply,
		uint totalSupply,
		uint utilizationRate,
		uint kinkRate,
		uint cachedSupplyRate
	) {
		BorrowableObject.Borrowable memory borrowableObj = BorrowableObject.newBorrowable(IBorrowable(borrowable), address(this));
		borrowableObj = borrowableObj.allocate(amount);
		(
			externalSupply,
			initialOwnedSupply,
			ownedSupply,
			totalSupply,
			utilizationRate,
			kinkRate,
			cachedSupplyRate
		) = _getBorrowableInfo(borrowableObj);
	}
	
	function testDeallocate(address borrowable, uint amount) external returns (
		uint externalSupply,
		uint initialOwnedSupply,
		uint ownedSupply,
		uint totalSupply,
		uint utilizationRate,
		uint kinkRate,
		uint cachedSupplyRate
	) {
		BorrowableObject.Borrowable memory borrowableObj = BorrowableObject.newBorrowable(IBorrowable(borrowable), address(this));
		borrowableObj = borrowableObj.deallocate(amount);
		(
			externalSupply,
			initialOwnedSupply,
			ownedSupply,
			totalSupply,
			utilizationRate,
			kinkRate,
			cachedSupplyRate
		) = _getBorrowableInfo(borrowableObj);
	}
	
	function testDeallocateMax(address borrowable) external returns (
		uint externalSupply,
		uint initialOwnedSupply,
		uint ownedSupply,
		uint totalSupply,
		uint utilizationRate,
		uint kinkRate,
		uint cachedSupplyRate,
		uint amount
	) {
		BorrowableObject.Borrowable memory borrowableObj = BorrowableObject.newBorrowable(IBorrowable(borrowable), address(this));
		(borrowableObj, amount) = borrowableObj.deallocateMax();
		(
			externalSupply,
			initialOwnedSupply,
			ownedSupply,
			totalSupply,
			utilizationRate,
			kinkRate,
			cachedSupplyRate
		) = _getBorrowableInfo(borrowableObj);
	}

	modifier onlyAdmin() {
		_;
	}
}