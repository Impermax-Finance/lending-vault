pragma solidity =0.5.16;

import "./LendingVaultV1.sol";
import "./interfaces/ILVDeployerV1.sol";

/*
 * This contract is used by the Factory to deploy LendingVaultV1
 * The bytecode would be too long to fit in the Factory
 */
 
contract LVDeployerV1 is ILVDeployerV1 {
	constructor () public {}
	
	function deployVault() external returns (address vault) {
		vault = address(new LendingVaultV1());
	}
}