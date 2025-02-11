pragma solidity =0.5.16;

import "./LVDeployerV2.sol";
import "./interfaces/ILendingVaultV2.sol";
import "./interfaces/ILendingVaultV2Factory.sol";
import "./interfaces/IERC20.sol";
import "./libraries/StringHelpers.sol";

contract LendingVaultV2Factory is ILendingVaultV2Factory {
	using StringHelpers for string;
	
	address public admin;
	address public pendingAdmin;
	address public reservesAdmin;
	address public reservesPendingAdmin;
	address public reservesManager;
		
	address[] public allVaults;
	function allVaultsLength() external view returns (uint) {
		return allVaults.length;
	}
	
	ILVDeployerV2 public LVDeployerV2;
	
	constructor(address _admin, address _reservesAdmin, ILVDeployerV2 _LVDeployerV2) public {
		admin = _admin;
		reservesAdmin = _reservesAdmin;
		LVDeployerV2 = _LVDeployerV2;
		emit NewAdmin(address(0), _admin);
		emit NewReservesAdmin(address(0), _reservesAdmin);
	}
	
	function createVault(address underlying, string calldata _name, string calldata _symbol) external returns (address vault) {
		string memory name = _name.orElse(string("Impermax ").append(IERC20(address(underlying)).symbol()).append(" Lending Vault"));
		string memory symbol = _symbol.orElse(string("i").append(IERC20(address(underlying)).symbol()));
		vault = LVDeployerV2.deployVault();
		ILendingVaultV2(vault)._setFactory();
		ILendingVaultV2(vault)._initialize(underlying, name, symbol);
		allVaults.push(vault);
		emit VaultCreated(underlying, vault, allVaults.length);
	}
	
	function _setPendingAdmin(address newPendingAdmin) external {
		require(msg.sender == admin, "LendingAggregatorV2Factory: UNAUTHORIZED");
		address oldPendingAdmin = pendingAdmin;
		pendingAdmin = newPendingAdmin;
		emit NewPendingAdmin(oldPendingAdmin, newPendingAdmin);
	}

	function _acceptAdmin() external {
		require(msg.sender == pendingAdmin, "LendingAggregatorV2Factory: UNAUTHORIZED");
		address oldAdmin = admin;
		address oldPendingAdmin = pendingAdmin;
		admin = pendingAdmin;
		pendingAdmin = address(0);
		emit NewAdmin(oldAdmin, admin);
		emit NewPendingAdmin(oldPendingAdmin, address(0));
	}
	
	function _setReservesPendingAdmin(address newReservesPendingAdmin) external {
		require(msg.sender == reservesAdmin, "LendingAggregatorV2Factory: UNAUTHORIZED");
		address oldReservesPendingAdmin = reservesPendingAdmin;
		reservesPendingAdmin = newReservesPendingAdmin;
		emit NewReservesPendingAdmin(oldReservesPendingAdmin, newReservesPendingAdmin);
	}

	function _acceptReservesAdmin() external {
		require(msg.sender == reservesPendingAdmin, "LendingAggregatorV2Factory: UNAUTHORIZED");
		address oldReservesAdmin = reservesAdmin;
		address oldReservesPendingAdmin = reservesPendingAdmin;
		reservesAdmin = reservesPendingAdmin;
		reservesPendingAdmin = address(0);
		emit NewReservesAdmin(oldReservesAdmin, reservesAdmin);
		emit NewReservesPendingAdmin(oldReservesPendingAdmin, address(0));
	}

	function _setReservesManager(address newReservesManager) external {
		require(msg.sender == reservesAdmin, "LendingAggregatorV2Factory: UNAUTHORIZED");
		address oldReservesManager = reservesManager;
		reservesManager = newReservesManager;
		emit NewReservesManager(oldReservesManager, newReservesManager);
	}
}
