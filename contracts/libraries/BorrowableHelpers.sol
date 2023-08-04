pragma solidity =0.5.16;

import "./SafeMath.sol";

import "../interfaces/IBorrowable.sol";
import "../interfaces/IERC20.sol";

library BorrowableHelpers {
	using SafeMath for uint256;

	function borrowableValueOf(address borrowable, uint256 underlyingAmount) internal returns (uint256) {
		uint256 exchangeRate = IBorrowable(borrowable).exchangeRate();
		return underlyingAmount.mul(1e18).div(exchangeRate);
	}

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
	
	/*** V1 ***/
	
	function tokensFor(uint redeemAmount, uint exchangeRate, bool atMost) internal pure returns (uint redeemTokens) {
		uint redeemTokensLow = redeemAmount.mul(1e18).div(exchangeRate);
		uint redeemTokensHigh = redeemTokensLow.add(1);
		uint actualRedeemAmountLow = redeemTokensLow.mul(exchangeRate).div(1e18);
		uint actualRedeemAmountHigh = redeemTokensHigh.mul(exchangeRate).div(1e18);
		
		if (atMost) {
			return actualRedeemAmountHigh <= redeemAmount ? redeemTokensHigh : redeemTokensLow;
		} else {
			return actualRedeemAmountLow >= redeemAmount ? redeemTokensLow : redeemTokensHigh;
		}
	}
	
	function tokensForAtMost(uint redeemAmount, uint exchangeRate) internal pure returns (uint redeemTokens) {
		return tokensFor(redeemAmount, exchangeRate, true);
	}
	
	function tokensForAtLeast(uint redeemAmount, uint exchangeRate) internal pure returns (uint redeemTokens) {
		return tokensFor(redeemAmount, exchangeRate, false);
	}
	
	/*** V2 ***/
/*
	function tokensForAtMost(uint redeemAmount, uint exchangeRate) internal pure returns (uint redeemTokens) {
		uint y = redeemAmount.mul(1e18).div(exchangeRate).mul(exchangeRate).mod(1e18).add(exchangeRate).div(1e18);
		uint adjX = redeemAmount.mul(1e18).mod(exchangeRate).mod(1e18) == 0 ? 0 : 1;
		uint x = redeemAmount.mul(1e18).mod(exchangeRate).div(1e18).add(adjX);
		uint adjustment = y <= x ? 1 : 0;
		redeemTokens = redeemAmount.mul(1e18).div(exchangeRate).add(adjustment);
	}

	function tokensForAtLeast(uint redeemAmount, uint exchangeRate) internal pure returns (uint redeemTokens) {
		uint adjustment = redeemAmount.mul(1e18).mod(exchangeRate) == 0 ? 0 : 1;
		redeemTokens = redeemAmount.mul(1e18).div(exchangeRate).add(adjustment);
	}*/
}