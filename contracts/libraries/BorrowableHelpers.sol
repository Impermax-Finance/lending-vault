pragma solidity =0.5.16;

import "./SafeMath.sol";

import "../interfaces/IBorrowable.sol";
import "../interfaces/IERC20.sol";

library BorrowableHelpers {
	using SafeMath for uint256;

	function underlyingValueOf(address borrowable, uint256 borrowableAmount) internal returns (uint256) {
		uint256 exchangeRate = IBorrowable(borrowable).exchangeRate();
		return borrowableAmount.mul(exchangeRate).div(1e18);
	}

	function underlyingBalanceOf(address borrowable, address account) internal returns (uint256) {
		return underlyingValueOf(borrowable, IBorrowable(borrowable).balanceOf(account));
	}

	function myUnderlyingBalance(address borrowable) internal returns (uint256) {
		return underlyingValueOf(borrowable, IBorrowable(borrowable).balanceOf(address(this)));
	}
	
	/*** AMOUNT TO TOKENS CONVERSION ***/
		
	function tokensFor(uint redeemAmount, uint exchangeRate, bool atMost) internal pure returns (uint redeemTokens) {
		uint redeemTokensLow = redeemAmount.mul(1e18).div(exchangeRate);
		uint redeemTokensHigh = redeemTokensLow.add(1);
		
		if (atMost) {
			uint actualRedeemAmountHigh = redeemTokensHigh.mul(exchangeRate).div(1e18);
			return actualRedeemAmountHigh <= redeemAmount ? redeemTokensHigh : redeemTokensLow;
		} else {
			uint actualRedeemAmountLow = redeemTokensLow.mul(exchangeRate).div(1e18);
			return actualRedeemAmountLow >= redeemAmount ? redeemTokensLow : redeemTokensHigh;
		}
	}
	
	function tokensForAtMost(uint redeemAmount, uint exchangeRate) internal pure returns (uint redeemTokens) {
		return tokensFor(redeemAmount, exchangeRate, true);
	}
	
	function tokensForAtLeast(uint redeemAmount, uint exchangeRate) internal pure returns (uint redeemTokens) {
		return tokensFor(redeemAmount, exchangeRate, false);
	}
}