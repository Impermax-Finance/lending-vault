pragma solidity =0.5.16;

import "./BorrowableHarness.sol";
import "../LendingVaultV1.sol";
import "../interfaces/ILendingVaultCallee.sol";

contract FlashAllocatePoC is ILendingVaultCallee {
	function executeFlashAllocate(address lendingVault, address borrowable, uint allocateAmount) external {
		LendingVaultV1(lendingVault).flashAllocate(borrowable, allocateAmount, new bytes(0));
	}

    function lendingVaultAllocate(address borrowable, uint allocateAmount, bytes calldata data) external {
		data;
		BorrowableHarness(borrowable).simulateBorrowBurningTokens(allocateAmount);
	}
}