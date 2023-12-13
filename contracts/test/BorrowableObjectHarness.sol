pragma solidity =0.5.16;
pragma experimental ABIEncoderV2;

import "../libraries/BorrowableObject.sol";

contract BorrowableObjectHarness {
	using BorrowableObject for BorrowableObject.Borrowable;

	constructor () public {}

	function totalSupply(BorrowableObject.Borrowable calldata borrowable) external pure returns (uint) {
		return borrowable.totalSupply();
	}

	function utilizationRate(BorrowableObject.Borrowable calldata borrowable) external pure returns (uint) {
		return borrowable.utilizationRate();
	}

	function kinkRate(BorrowableObject.Borrowable calldata borrowable) external pure returns (uint) {
		return borrowable.kinkRate();
	}

	function supplyRate(BorrowableObject.Borrowable calldata borrowable) external pure returns (uint) {
		return borrowable.supplyRate();
	}

	function calculateUtilizationForRate(BorrowableObject.Borrowable calldata borrowable, uint rate) external pure returns (uint) {
		return borrowable.calculateUtilizationForRate(rate);
	}

	function calculateAmountForRate(BorrowableObject.Borrowable calldata borrowable, uint rate) external pure returns (uint) {
		return borrowable.calculateAmountForRate(rate);
	}
}