pragma solidity >=0.5.0;

interface ILVDeployerV2 {
	function deployVault() external returns (address vault);
}