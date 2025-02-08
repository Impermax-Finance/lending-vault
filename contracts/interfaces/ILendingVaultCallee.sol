pragma solidity >=0.5.0;

interface ILendingVaultCallee {
    function lendingVaultAllocate(address borrowable, uint allocateAmount, bytes calldata data) external;
}