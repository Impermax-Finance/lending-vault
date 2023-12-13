pragma solidity =0.5.16;

import "./interfaces/ILendingVaultV1.sol";
import "./interfaces/IERC20.sol";
import "./libraries/SafeMath.sol";
import "./libraries/Math.sol";
import "./libraries/BorrowableObject.sol";

contract LendingVaultWatcher01 {	
	using SafeMath for uint;
	using BorrowableObject for BorrowableObject.Borrowable;

	function getAvailableLiquidity(address vault) external returns (uint availableLiquidity) {
		uint borrowablesLength = ILendingVaultV1(vault).getBorrowablesLength();
		address underlying = ILendingVaultV1(vault).underlying();
		for (uint i = 0; i < borrowablesLength; i++) {
			address borrowable = ILendingVaultV1(vault).borrowables(i);
			BorrowableObject.Borrowable memory borrowableObject = BorrowableObject.newBorrowable(IBorrowable(borrowable), vault);
			uint suppliedAmount = borrowableObject.ownedSupply;
			uint liquidity = IERC20(underlying).balanceOf(borrowable);
			availableLiquidity += Math.min(suppliedAmount, liquidity);
		}
	}

	function getSupplyRate(address vault) external returns (uint supplyRate) {
		uint borrowablesLength = ILendingVaultV1(vault).getBorrowablesLength();
		uint reserveFactor = ILendingVaultV1(vault).reserveFactor();
		uint totalSuppliedAmount;
		uint totalProfitsPerSecond;
		for (uint i = 0; i < borrowablesLength; i++) {
			address borrowable = ILendingVaultV1(vault).borrowables(i);
			BorrowableObject.Borrowable memory borrowableObject = BorrowableObject.newBorrowable(IBorrowable(borrowable), vault);
			uint borrowableRate = borrowableObject.cachedSupplyRate;
			uint suppliedAmount = borrowableObject.ownedSupply;
			totalSuppliedAmount += suppliedAmount;
			totalProfitsPerSecond += borrowableRate * suppliedAmount;
		}
		return totalProfitsPerSecond / totalSuppliedAmount * (uint(1e18).sub(reserveFactor)) / 1e18;
	}
}