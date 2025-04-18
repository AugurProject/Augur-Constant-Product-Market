export const AUDIT_FUNDS_ABI = [
	{
		"constant": true,
		"inputs": [
			{
				"internalType": "address",
				"name": "_origin",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_nonce",
				"type": "uint256"
			}
		],
		"name": "addressFrom",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"payable": false,
		"stateMutability": "pure",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "disputeCrowdsourcerFactory",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"internalType": "address",
				"name": "_account",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_offset",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_num",
				"type": "uint256"
			}
		],
		"name": "getAvailableDisputes",
		"outputs": [
			{
				"components": [
					{
						"internalType": "contract IMarket",
						"name": "market",
						"type": "address"
					},
					{
						"internalType": "contract IReportingParticipant",
						"name": "bond",
						"type": "address"
					},
					{
						"internalType": "uint256",
						"name": "amount",
						"type": "uint256"
					}
				],
				"internalType": "struct AuditFunds.StakeData[]",
				"name": "_data",
				"type": "tuple[]"
			},
			{
				"internalType": "bool",
				"name": "_done",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"internalType": "address",
				"name": "_account",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_offset",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_num",
				"type": "uint256"
			}
		],
		"name": "getAvailableReports",
		"outputs": [
			{
				"components": [
					{
						"internalType": "contract IMarket",
						"name": "market",
						"type": "address"
					},
					{
						"internalType": "contract IReportingParticipant",
						"name": "bond",
						"type": "address"
					},
					{
						"internalType": "uint256",
						"name": "amount",
						"type": "uint256"
					}
				],
				"internalType": "struct AuditFunds.StakeData[]",
				"name": "_data",
				"type": "tuple[]"
			},
			{
				"internalType": "bool",
				"name": "_done",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"internalType": "address",
				"name": "_account",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_offset",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_num",
				"type": "uint256"
			}
		],
		"name": "getAvailableShareData",
		"outputs": [
			{
				"components": [
					{
						"internalType": "contract IMarket",
						"name": "market",
						"type": "address"
					},
					{
						"internalType": "uint256",
						"name": "payout",
						"type": "uint256"
					}
				],
				"internalType": "struct AuditFunds.ShareData[]",
				"name": "_data",
				"type": "tuple[]"
			},
			{
				"internalType": "bool",
				"name": "_done",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "getInitialized",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "initialReporterFactory",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IAugur",
				"name": "_augur",
				"type": "address"
			}
		],
		"name": "initialize",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "marketFactory",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "shareToken",
		"outputs": [
			{
				"internalType": "contract IShareToken",
				"name": "",
				"type": "address"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	}
] as const
