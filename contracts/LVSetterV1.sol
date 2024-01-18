pragma solidity =0.5.16;

import "./LVAllocatorV1.sol";
import "./interfaces/ILendingVaultV1Factory.sol";

contract LVSetterV1 is LVAllocatorV1 {

	uint public constant RESERVE_FACTOR_MAX = 0.90e18; //90%
	uint private constant MAX_BORROWABLES_LENGTH = 10;

	function _initialize(
		address _underlying,
		string calldata _name,
		string calldata _symbol
	) external {
		require(msg.sender == factory, "LendingVaultV1: UNAUTHORIZED"); // sufficient check
		_setName(_name, _symbol);
		underlying = _underlying;
		exchangeRateLast = initialExchangeRate;
	}
	
	function _setReserveFactor(uint newReserveFactor) external onlyAdmin nonReentrant {
		require(newReserveFactor <= RESERVE_FACTOR_MAX, "LendingVaultV1: INVALID_SETTING");
		reserveFactor = newReserveFactor;
		emit NewReserveFactor(newReserveFactor);
	}
	
	/*** Borrowables management ***/

	function addBorrowable(address borrowable) external onlyAdmin nonReentrant {
		require(IBorrowable(borrowable).underlying() == underlying, "LendingVaultV1: INVALID_UNDERLYING");
		require(!borrowableInfo[borrowable].exists, "LendingVaultV1: BORROWABLE_EXISTS");
		require(borrowables.length < MAX_BORROWABLES_LENGTH, "LendingVaultV1: MAX_BORROWABLES_LENGTH");

		borrowableInfo[borrowable].exists = true;
		borrowableInfo[borrowable].enabled = true;
		borrowables.push(borrowable);

		emit AddBorrowable(address(borrowable));
	}

	function removeBorrowable(address borrowable) external onlyAdmin nonReentrant {
		require(borrowableInfo[borrowable].exists, "LendingVaultV1: BORROWABLE_DOESNT_EXISTS");
		require(!borrowableInfo[borrowable].enabled, "LendingVaultV1: BORROWABLE_ENABLED");
		require(borrowable.balanceOf(address(this)) == 0, "LendingVaultV1: NOT_EMPTY");

		uint lastIndex = borrowables.length - 1;
		uint index = indexOfBorrowable(borrowable);

		borrowables[index] = borrowables[lastIndex];
		borrowables.pop();
		delete borrowableInfo[borrowable];

		emit RemoveBorrowable(address(borrowable));
	}

	function disableBorrowable(address borrowable) external onlyAdmin nonReentrant {
		require(borrowableInfo[borrowable].exists, "LendingVaultV1: BORROWABLE_DOESNT_EXISTS");
		require(borrowableInfo[borrowable].enabled, "LendingVaultV1: BORROWABLE_DISABLED");

		borrowableInfo[borrowable].enabled = false;

		emit DisableBorrowable(address(borrowable));
	}

	function enableBorrowable(address borrowable) external onlyAdmin nonReentrant {
		require(borrowableInfo[borrowable].exists, "LendingVaultV1: BORROWABLE_DOESNT_EXISTS");
		require(!borrowableInfo[borrowable].enabled, "LendingVaultV1: BORROWABLE_ENABLED");

		borrowableInfo[borrowable].enabled = true;

		emit EnableBorrowable(address(borrowable));
	}

	function unwindBorrowable(address borrowable) external onlyAdmin nonReentrant update {
		require(borrowableInfo[borrowable].exists, "LendingVaultV1: BORROWABLE_DOESNT_EXISTS");
		require(!borrowableInfo[borrowable].enabled, "LendingVaultV1: BORROWABLE_ENABLED");	
		
		uint underlyingBalance = borrowable.myUnderlyingBalance();
		require(underlyingBalance > 0, "LendingVaultV1: ZERO_AMOUNT");
		uint actualRedeemAmount = _deallocateAtLeastOrMax(IBorrowable(borrowable), underlyingBalance);	

		emit UnwindBorrowable(address(borrowable), underlyingBalance, actualRedeemAmount);
	}
	
	modifier onlyAdmin() {
		require(msg.sender == ILendingVaultV1Factory(factory).admin(), "LendingVaultV1: UNAUTHORIZED");
		_;
	}
}