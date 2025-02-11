pragma solidity =0.5.16;

import "./LendingVaultV2.sol";
import "./interfaces/ILVDeployerV2.sol";

/*
 * This contract is used by the Factory to deploy LendingVaultV2
 * The bytecode would be too long to fit in the Factory
 */
 
contract LVDeployerV2 is ILVDeployerV2 {
	constructor () public {}
	
	function deployVault() external returns (address vault) {
		vault = address(new LendingVaultV2());
	}
}