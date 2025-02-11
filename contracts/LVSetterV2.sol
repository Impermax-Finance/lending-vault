pragma solidity =0.5.16;

import "./LVAllocatorV2.sol";
import "./interfaces/ILendingVaultV2Factory.sol";

contract LVSetterV2 is LVAllocatorV2 {

	uint public constant RESERVE_FACTOR_MAX = 0.90e18; //90%
	uint private constant MAX_BORROWABLES_LENGTH = 10;

	function _initialize(
		address _underlying,
		string calldata _name,
		string calldata _symbol
	) external {
		require(msg.sender == factory, "LendingVaultV2: UNAUTHORIZED"); // sufficient check
		_setName(_name, _symbol);
		underlying = _underlying;
		exchangeRateLast = initialExchangeRate;
	}
	
	function _setReserveFactor(uint newReserveFactor) external onlyAdmin nonReentrant {
		require(newReserveFactor <= RESERVE_FACTOR_MAX, "LendingVaultV2: INVALID_SETTING");
		reserveFactor = newReserveFactor;
		emit NewReserveFactor(newReserveFactor);
	}
	
	/*** Borrowables management ***/

	function addBorrowable(address borrowable) external onlyAdmin nonReentrant {
		require(IBorrowable(borrowable).underlying() == underlying, "LendingVaultV2: INVALID_UNDERLYING");
		require(!borrowableInfo[borrowable].exists, "LendingVaultV2: BORROWABLE_EXISTS");
		require(borrowables.length < MAX_BORROWABLES_LENGTH, "LendingVaultV2: MAX_BORROWABLES_LENGTH");

		borrowableInfo[borrowable].exists = true;
		borrowableInfo[borrowable].enabled = true;
		borrowables.push(borrowable);

		emit AddBorrowable(address(borrowable));
	}

	function removeBorrowable(address borrowable) external onlyAdmin nonReentrant {
		require(borrowableInfo[borrowable].exists, "LendingVaultV2: BORROWABLE_DOESNT_EXISTS");
		require(!borrowableInfo[borrowable].enabled, "LendingVaultV2: BORROWABLE_ENABLED");
		require(borrowable.myUnderlyingBalance() == 0, "LendingVaultV2: NOT_EMPTY");

		uint lastIndex = borrowables.length - 1;
		uint index = indexOfBorrowable(borrowable);

		borrowables[index] = borrowables[lastIndex];
		borrowables.pop();
		delete borrowableInfo[borrowable];

		emit RemoveBorrowable(address(borrowable));
	}

	function disableBorrowable(address borrowable) external onlyAdmin nonReentrant {
		require(borrowableInfo[borrowable].exists, "LendingVaultV2: BORROWABLE_DOESNT_EXISTS");
		require(borrowableInfo[borrowable].enabled, "LendingVaultV2: BORROWABLE_DISABLED");

		borrowableInfo[borrowable].enabled = false;

		emit DisableBorrowable(address(borrowable));
	}

	function enableBorrowable(address borrowable) external onlyAdmin nonReentrant {
		require(borrowableInfo[borrowable].exists, "LendingVaultV2: BORROWABLE_DOESNT_EXISTS");
		require(!borrowableInfo[borrowable].enabled, "LendingVaultV2: BORROWABLE_ENABLED");

		borrowableInfo[borrowable].enabled = true;

		emit EnableBorrowable(address(borrowable));
	}

	function unwindBorrowable(address borrowable) external onlyAdmin nonReentrant update {
		require(borrowableInfo[borrowable].exists, "LendingVaultV2: BORROWABLE_DOESNT_EXISTS");
		require(!borrowableInfo[borrowable].enabled, "LendingVaultV2: BORROWABLE_ENABLED");	
		
		uint underlyingBalance = borrowable.myUnderlyingBalance();
		require(underlyingBalance > 0, "LendingVaultV2: ZERO_AMOUNT");
		
		uint redeemTokens = borrowable.myBalance();
		uint actualRedeemAmount = _deallocate(IBorrowable(borrowable), redeemTokens);	

		emit UnwindBorrowable(address(borrowable), underlyingBalance, actualRedeemAmount);
	}
	
	modifier onlyAdmin() {
		require(msg.sender == ILendingVaultV2Factory(factory).admin(), "LendingVaultV2: UNAUTHORIZED");
		_;
	}
}