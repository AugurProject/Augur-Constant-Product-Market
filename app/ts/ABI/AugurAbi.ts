// Augur ABI is too long for viem to get the types. This function has been split into separate variable
export const AUGUR_ABI_GET_MAXIUM_MARKET_END_DATE = [{
	"constant": false,
	"inputs": [],
	"name": "getMaximumMarketEndDate",
	"outputs": [
		{
			"internalType": "uint256",
			"name": "",
			"type": "uint256"
		}
	],
	"payable": false,
	"stateMutability": "nonpayable",
	"type": "function"
}] as const

export const AUGUR_ABI = [
	{
		"inputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "market",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "account",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "numCompleteSets",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"name": "CompleteSetsPurchased",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "market",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "account",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "numCompleteSets",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "fees",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"name": "CompleteSetsSold",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "designatedReportStake",
				"type": "uint256"
			}
		],
		"name": "DesignatedReportStakeChanged",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "market",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "disputeCrowdsourcer",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256[]",
				"name": "payoutNumerators",
				"type": "uint256[]"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "nextWindowStartTime",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "nextWindowEndTime",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "pacingOn",
				"type": "bool"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "totalRepStakedInPayout",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "totalRepStakedInMarket",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "disputeRound",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"name": "DisputeCrowdsourcerCompleted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "reporter",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "market",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "disputeCrowdsourcer",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amountStaked",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "description",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "uint256[]",
				"name": "payoutNumerators",
				"type": "uint256[]"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "currentStake",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "stakeRemaining",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "disputeRound",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"name": "DisputeCrowdsourcerContribution",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "market",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "disputeCrowdsourcer",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256[]",
				"name": "payoutNumerators",
				"type": "uint256[]"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "size",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "disputeRound",
				"type": "uint256"
			}
		],
		"name": "DisputeCrowdsourcerCreated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "reporter",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "market",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "disputeCrowdsourcer",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amountRedeemed",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "repReceived",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256[]",
				"name": "payoutNumerators",
				"type": "uint256[]"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"name": "DisputeCrowdsourcerRedeemed",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "disputeWindow",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "startTime",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "endTime",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "initial",
				"type": "bool"
			}
		],
		"name": "DisputeWindowCreated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [],
		"name": "FinishDeployment",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "reporter",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "market",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "initialReporter",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amountStaked",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "isDesignatedReporter",
				"type": "bool"
			},
			{
				"indexed": false,
				"internalType": "uint256[]",
				"name": "payoutNumerators",
				"type": "uint256[]"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "description",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "nextWindowStartTime",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "nextWindowEndTime",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"name": "InitialReportSubmitted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "reporter",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "market",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "initialReporter",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amountRedeemed",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "repReceived",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256[]",
				"name": "payoutNumerators",
				"type": "uint256[]"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"name": "InitialReporterRedeemed",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "market",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "to",
				"type": "address"
			}
		],
		"name": "InitialReporterTransferred",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "contract IUniverse",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "endTime",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "extraInfo",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "contract IMarket",
				"name": "market",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "marketCreator",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "designatedReporter",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "feePerCashInAttoCash",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "int256[]",
				"name": "prices",
				"type": "int256[]"
			},
			{
				"indexed": false,
				"internalType": "enum IMarket.MarketType",
				"name": "marketType",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "numTicks",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "bytes32[]",
				"name": "outcomes",
				"type": "bytes32[]"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "noShowBond",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"name": "MarketCreated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "market",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256[]",
				"name": "winningPayoutNumerators",
				"type": "uint256[]"
			}
		],
		"name": "MarketFinalized",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "market",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "originalUniverse",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newUniverse",
				"type": "address"
			}
		],
		"name": "MarketMigrated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "market",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "marketOI",
				"type": "uint256"
			}
		],
		"name": "MarketOIChanged",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "market",
				"type": "address"
			}
		],
		"name": "MarketParticipantsDisavowed",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "market",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "to",
				"type": "address"
			}
		],
		"name": "MarketRepBondTransferred",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "market",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "to",
				"type": "address"
			}
		],
		"name": "MarketTransferred",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "noShowBond",
				"type": "uint256"
			}
		],
		"name": "NoShowBondChanged",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "disputeWindow",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "account",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "attoParticipationTokens",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "feePayoutShare",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"name": "ParticipationTokensRedeemed",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "contractAddress",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "bytes32",
				"name": "key",
				"type": "bytes32"
			}
		],
		"name": "RegisterContract",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "reportingFee",
				"type": "uint256"
			}
		],
		"name": "ReportingFeeChanged",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "market",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "reportingParticipant",
				"type": "address"
			}
		],
		"name": "ReportingParticipantDisavowed",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "account",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "market",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "outcome",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "balance",
				"type": "uint256"
			}
		],
		"name": "ShareTokenBalanceChanged",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "newTimestamp",
				"type": "uint256"
			}
		],
		"name": "TimestampSet",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "token",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "enum Augur.TokenType",
				"name": "tokenType",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "market",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "balance",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "outcome",
				"type": "uint256"
			}
		],
		"name": "TokenBalanceChanged",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "token",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "target",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "enum Augur.TokenType",
				"name": "tokenType",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "market",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "totalSupply",
				"type": "uint256"
			}
		],
		"name": "TokensBurned",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "token",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "target",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "enum Augur.TokenType",
				"name": "tokenType",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "market",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "totalSupply",
				"type": "uint256"
			}
		],
		"name": "TokensMinted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "token",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "enum Augur.TokenType",
				"name": "tokenType",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "market",
				"type": "address"
			}
		],
		"name": "TokensTransferred",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "sender",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "market",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "outcome",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "numShares",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "numPayoutTokens",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "fees",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"name": "TradingProceedsClaimed",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "parentUniverse",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "childUniverse",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256[]",
				"name": "payoutNumerators",
				"type": "uint256[]"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "creationTimestamp",
				"type": "uint256"
			}
		],
		"name": "UniverseCreated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "contract IMarket",
				"name": "forkingMarket",
				"type": "address"
			}
		],
		"name": "UniverseForked",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "validityBond",
				"type": "uint256"
			}
		],
		"name": "ValidityBondChanged",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "universe",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "warpSyncHash",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "marketEndTime",
				"type": "uint256"
			}
		],
		"name": "WarpSyncDataUpdated",
		"type": "event"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "DEFAULT_RECOMMENDED_TRADE_INTERVAL",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "MIN_TRADE_INTERVAL",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "TRADE_INTERVAL_VALUE",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "cash",
		"outputs": [
			{
				"internalType": "contract ICash",
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
				"internalType": "bytes32",
				"name": "_parentPayoutDistributionHash",
				"type": "bytes32"
			},
			{
				"internalType": "uint256[]",
				"name": "_parentPayoutNumerators",
				"type": "uint256[]"
			}
		],
		"name": "createChildUniverse",
		"outputs": [
			{
				"internalType": "contract IUniverse",
				"name": "",
				"type": "address"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [],
		"name": "createGenesisUniverse",
		"outputs": [
			{
				"internalType": "contract IUniverse",
				"name": "",
				"type": "address"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"internalType": "uint256[]",
				"name": "_payoutNumerators",
				"type": "uint256[]"
			},
			{
				"internalType": "uint256",
				"name": "_numTicks",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_numOutcomes",
				"type": "uint256"
			}
		],
		"name": "derivePayoutDistributionHash",
		"outputs": [
			{
				"internalType": "bytes32",
				"name": "",
				"type": "bytes32"
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
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_market",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_disputeCrowdsourcer",
				"type": "address"
			},
			{
				"internalType": "uint256[]",
				"name": "_payoutNumerators",
				"type": "uint256[]"
			},
			{
				"internalType": "uint256",
				"name": "_size",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_disputeRound",
				"type": "uint256"
			}
		],
		"name": "disputeCrowdsourcerCreated",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [],
		"name": "finishDeployment",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "forkCounter",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "genesisUniverse",
		"outputs": [
			{
				"internalType": "contract IUniverse",
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
				"internalType": "contract IMarket",
				"name": "_market",
				"type": "address"
			}
		],
		"name": "getMarketCreationData",
		"outputs": [
			{
				"components": [
					{
						"internalType": "string",
						"name": "extraInfo",
						"type": "string"
					},
					{
						"internalType": "address",
						"name": "marketCreator",
						"type": "address"
					},
					{
						"internalType": "bytes32[]",
						"name": "outcomes",
						"type": "bytes32[]"
					},
					{
						"internalType": "int256[]",
						"name": "displayPrices",
						"type": "int256[]"
					},
					{
						"internalType": "enum IMarket.MarketType",
						"name": "marketType",
						"type": "uint8"
					},
					{
						"internalType": "uint256",
						"name": "recommendedTradeInterval",
						"type": "uint256"
					}
				],
				"internalType": "struct IAugurCreationDataGetter.MarketCreationData",
				"name": "",
				"type": "tuple"
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
				"internalType": "contract IMarket",
				"name": "_market",
				"type": "address"
			}
		],
		"name": "getMarketOutcomes",
		"outputs": [
			{
				"internalType": "bytes32[]",
				"name": "_outcomes",
				"type": "bytes32[]"
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
				"internalType": "contract IMarket",
				"name": "_market",
				"type": "address"
			}
		],
		"name": "getMarketRecommendedTradeInterval",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
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
				"internalType": "contract IMarket",
				"name": "_market",
				"type": "address"
			}
		],
		"name": "getMarketType",
		"outputs": [
			{
				"internalType": "enum IMarket.MarketType",
				"name": "_marketType",
				"type": "uint8"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [],
		"name": "getMaximumMarketEndDate",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "getTimestamp",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
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
				"internalType": "uint256",
				"name": "_displayRange",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_numTicks",
				"type": "uint256"
			}
		],
		"name": "getTradeInterval",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "pure",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			}
		],
		"name": "getUniverseForkIndex",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
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
				"internalType": "contract IDisputeCrowdsourcer",
				"name": "_crowdsourcer",
				"type": "address"
			}
		],
		"name": "isKnownCrowdsourcer",
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
		"inputs": [
			{
				"internalType": "address",
				"name": "_feeSender",
				"type": "address"
			}
		],
		"name": "isKnownFeeSender",
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
		"inputs": [
			{
				"internalType": "contract IMarket",
				"name": "_market",
				"type": "address"
			}
		],
		"name": "isKnownMarket",
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
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			}
		],
		"name": "isKnownUniverse",
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
		"constant": false,
		"inputs": [
			{
				"internalType": "address",
				"name": "_address",
				"type": "address"
			}
		],
		"name": "isTrustedSender",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "contract IMarket",
				"name": "_market",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_account",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_numCompleteSets",
				"type": "uint256"
			}
		],
		"name": "logCompleteSetsPurchased",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "contract IMarket",
				"name": "_market",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_account",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_numCompleteSets",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_fees",
				"type": "uint256"
			}
		],
		"name": "logCompleteSetsSold",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_designatedReportStake",
				"type": "uint256"
			}
		],
		"name": "logDesignatedReportStakeChanged",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_market",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_disputeCrowdsourcer",
				"type": "address"
			},
			{
				"internalType": "uint256[]",
				"name": "_payoutNumerators",
				"type": "uint256[]"
			},
			{
				"internalType": "uint256",
				"name": "_nextWindowStartTime",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_nextWindowEndTime",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "_pacingOn",
				"type": "bool"
			},
			{
				"internalType": "uint256",
				"name": "_totalRepStakedInPayout",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_totalRepStakedInMarket",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_disputeRound",
				"type": "uint256"
			}
		],
		"name": "logDisputeCrowdsourcerCompleted",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_reporter",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_market",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_disputeCrowdsourcer",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_amountStaked",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "_description",
				"type": "string"
			},
			{
				"internalType": "uint256[]",
				"name": "_payoutNumerators",
				"type": "uint256[]"
			},
			{
				"internalType": "uint256",
				"name": "_currentStake",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_stakeRemaining",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_disputeRound",
				"type": "uint256"
			}
		],
		"name": "logDisputeCrowdsourcerContribution",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_reporter",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_market",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_amountRedeemed",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_repReceived",
				"type": "uint256"
			},
			{
				"internalType": "uint256[]",
				"name": "_payoutNumerators",
				"type": "uint256[]"
			}
		],
		"name": "logDisputeCrowdsourcerRedeemed",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_target",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_amount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_totalSupply",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_balance",
				"type": "uint256"
			}
		],
		"name": "logDisputeCrowdsourcerTokensBurned",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_target",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_amount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_totalSupply",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_balance",
				"type": "uint256"
			}
		],
		"name": "logDisputeCrowdsourcerTokensMinted",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_from",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_value",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_fromBalance",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_toBalance",
				"type": "uint256"
			}
		],
		"name": "logDisputeCrowdsourcerTokensTransferred",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IDisputeWindow",
				"name": "_disputeWindow",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_id",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "_initial",
				"type": "bool"
			}
		],
		"name": "logDisputeWindowCreated",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_reporter",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_market",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_initialReporter",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_amountStaked",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "_isDesignatedReporter",
				"type": "bool"
			},
			{
				"internalType": "uint256[]",
				"name": "_payoutNumerators",
				"type": "uint256[]"
			},
			{
				"internalType": "string",
				"name": "_description",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "_nextWindowStartTime",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_nextWindowEndTime",
				"type": "uint256"
			}
		],
		"name": "logInitialReportSubmitted",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_reporter",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_market",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_amountRedeemed",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_repReceived",
				"type": "uint256"
			},
			{
				"internalType": "uint256[]",
				"name": "_payoutNumerators",
				"type": "uint256[]"
			}
		],
		"name": "logInitialReporterRedeemed",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "contract IMarket",
				"name": "_market",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_from",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_to",
				"type": "address"
			}
		],
		"name": "logInitialReporterTransferred",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "uint256[]",
				"name": "_winningPayoutNumerators",
				"type": "uint256[]"
			}
		],
		"name": "logMarketFinalized",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IMarket",
				"name": "_market",
				"type": "address"
			},
			{
				"internalType": "contract IUniverse",
				"name": "_originalUniverse",
				"type": "address"
			}
		],
		"name": "logMarketMigrated",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "contract IMarket",
				"name": "_market",
				"type": "address"
			}
		],
		"name": "logMarketOIChanged",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			}
		],
		"name": "logMarketParticipantsDisavowed",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "address",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_from",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_to",
				"type": "address"
			}
		],
		"name": "logMarketRepBondTransferred",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_from",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_to",
				"type": "address"
			}
		],
		"name": "logMarketTransferred",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_noShowBond",
				"type": "uint256"
			}
		],
		"name": "logNoShowBondChanged",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_target",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_amount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_totalSupply",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_balance",
				"type": "uint256"
			}
		],
		"name": "logParticipationTokensBurned",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_target",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_amount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_totalSupply",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_balance",
				"type": "uint256"
			}
		],
		"name": "logParticipationTokensMinted",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_account",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_attoParticipationTokens",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_feePayoutShare",
				"type": "uint256"
			}
		],
		"name": "logParticipationTokensRedeemed",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_from",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_value",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_fromBalance",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_toBalance",
				"type": "uint256"
			}
		],
		"name": "logParticipationTokensTransferred",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_reportingFee",
				"type": "uint256"
			}
		],
		"name": "logReportingFeeChanged",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "contract IMarket",
				"name": "_market",
				"type": "address"
			}
		],
		"name": "logReportingParticipantDisavowed",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_target",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_amount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_totalSupply",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_balance",
				"type": "uint256"
			}
		],
		"name": "logReputationTokensBurned",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_target",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_amount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_totalSupply",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_balance",
				"type": "uint256"
			}
		],
		"name": "logReputationTokensMinted",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_from",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_value",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_fromBalance",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_toBalance",
				"type": "uint256"
			}
		],
		"name": "logReputationTokensTransferred",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "address",
				"name": "_account",
				"type": "address"
			},
			{
				"internalType": "contract IMarket",
				"name": "_market",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_outcome",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_balance",
				"type": "uint256"
			}
		],
		"name": "logShareTokensBalanceChanged",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_newTimestamp",
				"type": "uint256"
			}
		],
		"name": "logTimestampSet",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IUniverse",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_sender",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_market",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_outcome",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_numShares",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_numPayoutTokens",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_fees",
				"type": "uint256"
			}
		],
		"name": "logTradingProceedsClaimed",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "contract IMarket",
				"name": "_forkingMarket",
				"type": "address"
			}
		],
		"name": "logUniverseForked",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_validityBond",
				"type": "uint256"
			}
		],
		"name": "logValidityBondChanged",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "address",
				"name": "_universe",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_warpSyncHash",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_marketEndTime",
				"type": "uint256"
			}
		],
		"name": "logWarpSyncDataUpdated",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "_key",
				"type": "bytes32"
			}
		],
		"name": "lookup",
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
				"internalType": "uint256",
				"name": "_endTime",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "_extraInfo",
				"type": "string"
			},
			{
				"internalType": "contract IMarket",
				"name": "_market",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_marketCreator",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_designatedReporter",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_feePerCashInAttoCash",
				"type": "uint256"
			},
			{
				"internalType": "bytes32[]",
				"name": "_outcomes",
				"type": "bytes32[]"
			}
		],
		"name": "onCategoricalMarketCreated",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_endTime",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "_extraInfo",
				"type": "string"
			},
			{
				"internalType": "contract IMarket",
				"name": "_market",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_marketCreator",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_designatedReporter",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_feePerCashInAttoCash",
				"type": "uint256"
			},
			{
				"internalType": "int256[]",
				"name": "_prices",
				"type": "int256[]"
			},
			{
				"internalType": "uint256",
				"name": "_numTicks",
				"type": "uint256"
			}
		],
		"name": "onScalarMarketCreated",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_endTime",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "_extraInfo",
				"type": "string"
			},
			{
				"internalType": "contract IMarket",
				"name": "_market",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_marketCreator",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_designatedReporter",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_feePerCashInAttoCash",
				"type": "uint256"
			}
		],
		"name": "onYesNoMarketCreated",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "_key",
				"type": "bytes32"
			},
			{
				"internalType": "address",
				"name": "_address",
				"type": "address"
			}
		],
		"name": "registerContract",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "time",
		"outputs": [
			{
				"internalType": "contract ITime",
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
				"internalType": "address",
				"name": "_from",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_amount",
				"type": "uint256"
			}
		],
		"name": "trustedCashTransfer",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "upgradeTimestamp",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "uploader",
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
	}
] as const
