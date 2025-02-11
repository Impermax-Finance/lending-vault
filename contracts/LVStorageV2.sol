pragma solidity =0.5.16;

contract LVStorageV2 {
	address[] public borrowables;
	struct BorrowableInfo {
		bool enabled;
		bool exists;
	}
	mapping(address => BorrowableInfo) public borrowableInfo;
	function getBorrowablesLength() external view returns (uint) {
		return borrowables.length;
	}
	function indexOfBorrowable(address borrowable) public view returns (uint) {
		for (uint i = 0; i < borrowables.length; i++) {
			if (borrowables[i] == borrowable) {
				return i;
			}
		}
		require(false, "LendingVaultV2: BORROWABLE_NOT_FOUND");
	}

	uint public exchangeRateLast;

	uint public reserveFactor = 0.00e18; //0%
}