pragma solidity >=0.5.0;

interface ILVDeployerV1 {
	function deployVault() external returns (address vault);
}