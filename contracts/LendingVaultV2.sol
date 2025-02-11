pragma solidity =0.5.16;

import "./LVSetterV2.sol";
import "./interfaces/ILendingVaultV2Factory.sol";
import "./interfaces/ILendingVaultCallee.sol";
import "./interfaces/IBorrowable.sol";

contract LendingVaultV2 is LVSetterV2 {

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
				address reservesManager = ILendingVaultV2Factory(factory).reservesManager();
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
		require(mintTokens > 0, "LendingVaultV2: MINT_AMOUNT_ZERO");
		_mint(minter, mintTokens);
		_withdrawAndReallocate(0);
		emit Mint(msg.sender, minter, mintAmount, mintTokens);
	}

	// this low-level function should be called from another contract
	function redeem(address redeemer) external nonReentrant update returns (uint redeemAmount) {
		uint redeemTokens = balanceOf[address(this)];
		redeemAmount = redeemTokens.mul(exchangeRate()).div(1e18);

		require(redeemAmount > 0, "LendingVaultV2: REDEEM_AMOUNT_ZERO");
		_burn(address(this), redeemTokens);
		_withdrawAndReallocate(redeemAmount);
		underlying.safeTransfer(redeemer, redeemAmount);
		emit Redeem(msg.sender, redeemer, redeemAmount, redeemTokens);		
	}

	function reallocate() external nonReentrant update {
		_withdrawAndReallocate(0);
	}

	function flashAllocate(address borrowable, uint allocateAmount, bytes calldata data) external nonReentrant update {
		require(borrowableInfo[borrowable].exists, "LendingVaultV2: BORROWABLE_DOESNT_EXISTS");
		require(borrowableInfo[borrowable].enabled, "LendingVaultV2: BORROWABLE_DISABLED");
		
		_withdrawAndReallocate(allocateAmount);
		uint exchangeRate = IBorrowable(borrowable).exchangeRate();
		_allocate(IBorrowable(borrowable), allocateAmount, exchangeRate);
		ILendingVaultCallee(msg.sender).lendingVaultAllocate(borrowable, allocateAmount, data);
		_withdrawAndReallocate(0);
		require(IBorrowable(borrowable).totalBalance() > exchangeRate / 1e15, "LendingVaultV2: INCONVENIENT_REALLOCATION");
	}
}