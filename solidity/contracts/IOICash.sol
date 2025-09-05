pragma solidity 0.8.29;

interface IOICash {
	function deposit(uint256 _amount) external returns (bool);
	function withdraw(uint256 _amount) external returns (bool);
	function payFees(uint256 _feeAmount) external returns (bool);
}
