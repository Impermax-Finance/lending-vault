pragma solidity =0.5.16;

import "./LVSetterV1.sol";
import "./interfaces/ILendingVaultV1Factory.sol";

contract LendingVaultV1 is LVSetterV1 {

	// TODO QUESTO PU0' ESSERE OTTIMIZZATO PORTANDOSI DIETRO BORROWABLE OBJECT
	function _getTotalSupplied() internal returns (uint totalSupplied) {
		for (uint i = 0; i < borrowables.length; i++) {
			address borrowable = borrowables[i];
			totalSupplied = totalSupplied.add(borrowable.myUnderlyingBalance());
		}
	}
	
	function _mintReserves(uint _exchangeRate, uint _totalSupply) internal returns (uint) {
		uint _exchangeRateLast = exchangeRateLast;
		if (_exchangeRate > _exchangeRateLast) {
			uint _exchangeRateNew = _exchangeRate.sub( _exchangeRate.sub(_exchangeRateLast).mul(reserveFactor).div(1e18) );
			uint liquidity = _totalSupply.mul(_exchangeRate).div(_exchangeRateNew).sub(_totalSupply);
			if (liquidity > 0) {
				address reservesManager = ILendingVaultV1Factory(factory).reservesManager();
				_mint(reservesManager, liquidity);
			}
			exchangeRateLast = _exchangeRateNew;
			return _exchangeRateNew;
		}
		else return _exchangeRate;
	}
	
	function exchangeRate() public returns (uint) {
		uint _totalSupply = totalSupply;
		uint _actualBalance = totalBalance.add(_getTotalSupplied());
		if (_totalSupply == 0 || _actualBalance == 0) return initialExchangeRate;
		uint _exchangeRate = _actualBalance.mul(1e18).div(_totalSupply);
		return _mintReserves(_exchangeRate, _totalSupply);
	}
	
	// this low-level function should be called from another contract
	function mint(address minter) external nonReentrant update returns (uint mintTokens) {
		uint balance = underlying.myBalance();
		uint mintAmount = balance.sub(totalBalance);
		mintTokens = mintAmount.mul(1e18).div(exchangeRate());

		if(totalSupply == 0) {
			// permanently lock the first MINIMUM_LIQUIDITY tokens
			mintTokens = mintTokens.sub(MINIMUM_LIQUIDITY);
			_mint(address(0), MINIMUM_LIQUIDITY);
		}
		require(mintTokens > 0, "Impermax: MINT_AMOUNT_ZERO");
		_mint(minter, mintTokens);
		_withdrawAndReallocate(0);
		emit Mint(msg.sender, minter, mintAmount, mintTokens);
	}

	// this low-level function should be called from another contract
	function redeem(address redeemer) external nonReentrant update returns (uint redeemAmount) {
		uint redeemTokens = balanceOf[address(this)];
		redeemAmount = redeemTokens.mul(exchangeRate()).div(1e18);

		require(redeemAmount > 0, "LendingVaultV1: REDEEM_AMOUNT_ZERO");
		_burn(address(this), redeemTokens);
		_withdrawAndReallocate(redeemAmount);
		underlying.safeTransfer(redeemer, redeemAmount);
		emit Redeem(msg.sender, redeemer, redeemAmount, redeemTokens);		
	}

	function reallocate() external nonReentrant update {
		_withdrawAndReallocate(0);
	}
	
	/*** Utilities ***/
	
	//modifier onlyReallocateManager() {
	//	require(msg.sender == ILendingVaultV1Factory(factory).reallocateManager(), "LendingVaultV1: UNAUTHORIZED");
	//	_;
	//}
}