pragma solidity =0.5.16;

import "./interfaces/ILendingVaultV2.sol";
import "./interfaces/IERC20.sol";
import "./libraries/SafeMath.sol";
import "./libraries/Math.sol";
import "./libraries/BorrowableObject.sol";

contract LendingVaultWatcher01 {	
	using SafeMath for uint;
	using BorrowableObject for BorrowableObject.Borrowable;

	function getAvailableLiquidity(address vault) external returns (uint availableLiquidity) {
		uint borrowablesLength = ILendingVaultV2(vault).getBorrowablesLength();
		address underlying = ILendingVaultV2(vault).underlying();
		for (uint i = 0; i < borrowablesLength; i++) {
			address borrowable = ILendingVaultV2(vault).borrowables(i);
			BorrowableObject.Borrowable memory borrowableObject = BorrowableObject.newBorrowable(IBorrowable(borrowable), vault);
			uint suppliedAmount = borrowableObject.ownedSupply;
			uint liquidity = IERC20(underlying).balanceOf(borrowable);
			availableLiquidity += Math.min(suppliedAmount, liquidity);
		}
	}

	function getSupplyRate(address vault) external returns (uint supplyRate) {
		uint borrowablesLength = ILendingVaultV2(vault).getBorrowablesLength();
		uint reserveFactor = ILendingVaultV2(vault).reserveFactor();
		uint totalSuppliedAmount;
		uint totalProfitsPerSecond;
		for (uint i = 0; i < borrowablesLength; i++) {
			address borrowable = ILendingVaultV2(vault).borrowables(i);
			BorrowableObject.Borrowable memory borrowableObject = BorrowableObject.newBorrowable(IBorrowable(borrowable), vault);
			uint borrowableRate = borrowableObject.cachedSupplyRate;
			uint suppliedAmount = borrowableObject.ownedSupply;
			totalSuppliedAmount += suppliedAmount;
			totalProfitsPerSecond += borrowableRate * suppliedAmount;
		}
		return totalProfitsPerSecond / totalSuppliedAmount * (uint(1e18).sub(reserveFactor)) / 1e18;
	}
}