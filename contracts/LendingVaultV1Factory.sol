pragma solidity =0.5.16;

import "./LVDeployerV1.sol";
import "./interfaces/ILendingVaultV1.sol";
import "./interfaces/ILendingVaultV1Factory.sol";
import "./interfaces/IERC20.sol";
import "./libraries/StringHelpers.sol";

contract LendingVaultV1Factory is ILendingVaultV1Factory {
	using StringHelpers for string;
	
	address public admin;
	address public pendingAdmin;
	//address public reallocateManager;
	address public reservesAdmin;
	address public reservesPendingAdmin;
	address public reservesManager;
		
	address[] public allVaults;
	function allVaultsLength() external view returns (uint) {
		return allVaults.length;
	}
	
	ILVDeployerV1 public LVDeployerV1;
	
	constructor(address _admin, address _reservesAdmin, ILVDeployerV1 _LVDeployerV1) public {
		admin = _admin;
		reservesAdmin = _reservesAdmin;
		LVDeployerV1 = _LVDeployerV1;
		emit NewAdmin(address(0), _admin);
		emit NewReservesAdmin(address(0), _reservesAdmin);
	}
	
	function createVault(address underlying, string calldata _name, string calldata _symbol) external returns (address vault) {
		string memory name = _name.orElse(string("Impermax ").append(IERC20(address(underlying)).symbol()).append(" Lending Vault"));
		string memory symbol = _symbol.orElse(string("i").append(IERC20(address(underlying)).symbol()));
		vault = LVDeployerV1.deployVault();
		ILendingVaultV1(vault)._initialize(underlying, name, symbol);
		allVaults.push(vault);
		emit VaultCreated(underlying, vault, allVaults.length);
	}
	
	function _setPendingAdmin(address newPendingAdmin) external {
		require(msg.sender == admin, "LendingAggregatorV1Factory: UNAUTHORIZED");
		address oldPendingAdmin = pendingAdmin;
		pendingAdmin = newPendingAdmin;
		emit NewPendingAdmin(oldPendingAdmin, newPendingAdmin);
	}

	function _acceptAdmin() external {
		require(msg.sender == pendingAdmin, "LendingAggregatorV1Factory: UNAUTHORIZED");
		address oldAdmin = admin;
		address oldPendingAdmin = pendingAdmin;
		admin = pendingAdmin;
		pendingAdmin = address(0);
		emit NewAdmin(oldAdmin, admin);
		emit NewPendingAdmin(oldPendingAdmin, address(0));
	}

	//function _setReallocateManager(address newReallocateManager) external {
	//	require(msg.sender == admin, "LendingAggregatorV1Factory: UNAUTHORIZED");
	//	address oldReallocateManager = reallocateManager;
	//	reallocateManager = newReallocateManager;
	//	emit NewReallocateManager(oldReallocateManager, newReallocateManager);
	//}
	
	function _setReservesPendingAdmin(address newReservesPendingAdmin) external {
		require(msg.sender == reservesAdmin, "LendingAggregatorV1Factory: UNAUTHORIZED");
		address oldReservesPendingAdmin = reservesPendingAdmin;
		reservesPendingAdmin = newReservesPendingAdmin;
		emit NewReservesPendingAdmin(oldReservesPendingAdmin, newReservesPendingAdmin);
	}

	function _acceptReservesAdmin() external {
		require(msg.sender == reservesPendingAdmin, "LendingAggregatorV1Factory: UNAUTHORIZED");
		address oldReservesAdmin = reservesAdmin;
		address oldReservesPendingAdmin = reservesPendingAdmin;
		reservesAdmin = reservesPendingAdmin;
		reservesPendingAdmin = address(0);
		emit NewReservesAdmin(oldReservesAdmin, reservesAdmin);
		emit NewReservesPendingAdmin(oldReservesPendingAdmin, address(0));
	}

	function _setReservesManager(address newReservesManager) external {
		require(msg.sender == reservesAdmin, "LendingAggregatorV1Factory: UNAUTHORIZED");
		address oldReservesManager = reservesManager;
		reservesManager = newReservesManager;
		emit NewReservesManager(oldReservesManager, newReservesManager);
	}
}
