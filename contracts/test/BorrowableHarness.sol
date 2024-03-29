pragma solidity =0.5.16;

import "./Borrowable.sol";
import "./interfaces/ICollateral.sol";
import "../../contracts/interfaces/IERC20.sol";

contract BorrowableHarness is Borrowable {
	
	function setUnderlyingHarness(address _underlying) external {
		underlying = _underlying;
	}
	
	function setFactoryHarness(address _factory) external {
		factory = _factory;
	}
	
	function setCollateralHarness(address _collateral) external {
		collateral = _collateral;
	}
	
	bool useMockBorrowBalance;
	mapping(address => uint) public _borrowBalance;
	
	function borrowBalance(address borrower) public view returns (uint) {
		if (useMockBorrowBalance) return _borrowBalance[borrower];
		return super.borrowBalance(borrower);
	}
	
	function setBorrowBalanceHarness(address borrower, uint amount) external {
		useMockBorrowBalance = true;
		_borrowBalance[borrower] = amount;
	}
	
	function setBorrowBalances(address borrower, uint112 principal, uint112 interestIndex) external {
		borrowBalances[borrower].principal = principal;
		borrowBalances[borrower].interestIndex = interestIndex;
	}
	
	function setBorrowIndex(uint112 _borrowIndex) external {
		borrowIndex = _borrowIndex;
	}
	
	function seizeHarness(address collateral, address liquidator, address borrower, uint repayAmount) external returns (uint) {
		return ICollateral(collateral).seize(liquidator, borrower, repayAmount);
	}
	
	function setTotalBalance(uint _totalBalance) public {
		totalBalance = _totalBalance;
	}
	
	function setTotalBorrows(uint112 _totalBorrows) public {
		totalBorrows = _totalBorrows;
	}
	
	function setTotalSupply(uint _totalSupply) public {
		totalSupply = _totalSupply;
	}
	
	function setBorrowRate(uint48 _borrowRate) public {
		borrowRate = _borrowRate;
	}
	
	function setReserveFactor(uint _reserveFactor) public {
		reserveFactor = _reserveFactor;
	}
	
	function setAdjustSpeed(uint _adjustSpeed) public {
		adjustSpeed = _adjustSpeed;
	}
	
	uint32 _blockTimestamp;
	function getBlockTimestamp() public view returns (uint32) {
		return _blockTimestamp;
	}
	function setBlockTimestamp(uint blockTimestamp) public {
		_blockTimestamp = uint32(blockTimestamp % 2**32);
	}
	
	function setExchangeRateLast(uint128 _exchangeRateLast) public {
		exchangeRateLast = _exchangeRateLast;
	}
	
	function setBorrowTracker(address _borrowTracker) public {
		borrowTracker = _borrowTracker;
	}
	
	function setAccrualTimestamp(uint _accrualTimestamp) public {
		accrualTimestamp = uint32(_accrualTimestamp % 2**32);
	}
	
	function setRateUpdateTimestamp(uint _rateUpdateTimestamp) public {
		rateUpdateTimestamp = uint32(_rateUpdateTimestamp % 2**32);
	}
	
	function _mintReserves(uint _exchangeRate, uint _totalSupply) internal returns (uint) {
		_totalSupply;
		return _exchangeRate;
	}
	
	function simulateBorrow(uint borrowAmount) public accrue update {
		uint tokensToMint = borrowAmount * 1e18 / exchangeRate();
		totalSupply = totalSupply + tokensToMint;
		totalBorrows = safe112(totalBorrows + borrowAmount);
	}
	
	function simulateRepay(uint repayAmount) public accrue update {
		uint tokensToBurn = repayAmount * 1e18 / exchangeRate();
		totalSupply = totalSupply.sub(tokensToBurn);
		totalBorrows = safe112(uint(totalBorrows).sub(repayAmount));
	}
	
	function simulateBorrowBurningTokens(uint borrowAmount) public accrue update {
		IERC20(underlying).transfer(address(0), borrowAmount);
		totalBorrows = safe112(totalBorrows + borrowAmount);
	}

}