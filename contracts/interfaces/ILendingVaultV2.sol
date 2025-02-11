pragma solidity >=0.5.0;

interface ILendingVaultV1 {

	/*** Impermax ERC20 ***/
	
	event Transfer(address indexed from, address indexed to, uint value);
	event Approval(address indexed owner, address indexed spender, uint value);
	
	function name() external pure returns (string memory);
	function symbol() external pure returns (string memory);
	function decimals() external pure returns (uint8);
	function totalSupply() external view returns (uint);
	function balanceOf(address owner) external view returns (uint);
	function allowance(address owner, address spender) external view returns (uint);
	function approve(address spender, uint value) external returns (bool);
	function transfer(address to, uint value) external returns (bool);
	function transferFrom(address from, address to, uint value) external returns (bool);
	
	function DOMAIN_SEPARATOR() external view returns (bytes32);
	function PERMIT_TYPEHASH() external pure returns (bytes32);
	function nonces(address owner) external view returns (uint);
	function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external;
	
	/*** Pool Token ***/
	
	event Mint(address indexed sender, address indexed minter, uint mintAmount, uint mintTokens);
	event Redeem(address indexed sender, address indexed redeemer, uint redeemAmount, uint redeemTokens);
	event Sync(uint totalBalance);
	
	function underlying() external view returns (address);
	function factory() external view returns (address);
	function totalBalance() external view returns (uint);
	function MINIMUM_LIQUIDITY() external pure returns (uint);

	function exchangeRate() external returns (uint);
	function mint(address minter) external returns (uint mintTokens);
	function redeem(address redeemer) external returns (uint redeemAmount);
	function skim(address to) external;
	function sync() external;
	
	function _setFactory() external;
	
	/*** Lending Vault V1 ***/
	
	event AddBorrowable(address indexed borrowable);
	event RemoveBorrowable(address indexed borrowable);
	event EnableBorrowable(address indexed borrowable);
	event DisableBorrowable(address indexed borrowable);
	event UnwindBorrowable(address indexed borrowable, uint256 underlyingBalance, uint256 actualRedeemAmount);
	event AllocateIntoBorrowable(address indexed borrowable, uint256 mintAmount, uint256 mintTokens);
	event DeallocateFromBorrowable(address indexed borrowable, uint256 redeemAmount, uint256 redeemTokens);

	function borrowables(uint) external view returns (address borrowable);
	function borrowableInfo(address borrowable) external view returns (
		bool enabled,
		bool exists
	);
	function getBorrowablesLength() external view returns (uint);
	function indexOfBorrowable(address borrowable) external view returns (uint);

	function reserveFactor() external view returns (uint);
	function exchangeRateLast() external view returns (uint);
	
	function addBorrowable(address borrowable) external;
	function removeBorrowable(address borrowable) external;
	function disableBorrowable(address borrowable) external;
	function enableBorrowable(address borrowable) external;
	function unwindBorrowable(address borrowable) external;
	
	function reallocate() external;
		
	/*** Lending Vault Setter ***/

	event NewReserveFactor(uint newReserveFactor);

	function RESERVE_FACTOR_MAX() external pure returns (uint);
	
	function _initialize (
		address _underlying,
		string calldata _name,
		string calldata _symbol
	) external;
	function _setReserveFactor(uint newReserveFactor) external;
}