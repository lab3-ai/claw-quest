# Hướng Dẫn Deploy ClawQuestEscrow lên X Layer — Lấy TX Hash

## Tổng Quan

X Layer = Ethereum L2 (OP Stack), **EVM-equivalent** → deploy Solidity contract y hệt Ethereum.

| Thông tin | Mainnet | Testnet |
|-----------|---------|---------|
| **Chain ID** | `196` (0xC4) | `1952` (0x7A0) |
| **RPC** | `https://rpc.xlayer.tech` | `https://testrpc.xlayer.tech/terigon` |
| **Explorer** | [okx.com/web3/explorer/xlayer](https://www.okx.com/web3/explorer/xlayer) | [okx.com/web3/explorer/xlayer-test](https://www.okx.com/web3/explorer/xlayer-test) |
| **Gas Token** | **OKB** | OKB (testnet) |

---

## Prerequisites — Cần Chuẩn Bị

### 1. Foundry (đã có trong project)
```bash
# Kiểm tra đã cài chưa
forge --version

# Nếu chưa có:
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. OKB cho Gas Fees
> [!CAUTION]
> X Layer dùng **OKB** làm gas token (KHÔNG phải ETH). Cần có OKB trong deployer wallet.

**Cách lấy OKB:**
- **Mua trên OKX Exchange** → withdraw tới deployer wallet trên X Layer mainnet
- **Bridge từ Ethereum** → dùng [X Layer Bridge](https://www.okx.com/web3/bridge) để bridge OKB từ ETH L1 sang X Layer L2
- Lượng cần: ~0.01-0.05 OKB cho deployment (gas rất rẻ)

### 3. Deployer Private Key
Cần private key của wallet có OKB trên X Layer mainnet.

### 4. Token Addresses trên X Layer Mainnet

| Token | Address |
|-------|---------|
| **USDC** | `0x74b7F16337b8972027F6196A17a631aC6dE26d22` |
| **USDC.e** | `0xA8CE8aee21bC2A48a5EF670afCc9274C7bbbC035` |
| **USDT** | `0x1E4a5963aBFD975d8c9021ce480b42188849D41d` |
| **USDT0** | `0x779Ded0c9e1022225f8E0630b35a9b54bE713736` |
| **WOKB** | `0xe538905cf8410324e03A5A23C1c177a474D59b2b` |
| **WETH** | `0x5A77f1443D16ee5761d310e38b62f77f726bC71c` |
| **WBTC** | `0xEA034fb02eB1808C2cc3adbC15f447B93CbE08e1` |
| **DAI** | `0xC5015b9d9161Dca7e18e32f6f25C4aD850731Fd4` |

---

## Step-by-Step Deploy

### Step 1: Thêm X Layer vào `foundry.toml`

Mở [foundry.toml](file:///Users/macbookprom1/Documents/GitHub/clawquest/contracts/foundry.toml) và thêm:

```diff
 [rpc_endpoints]
 base_sepolia = "https://sepolia.base.org"
 base = "https://mainnet.base.org"
 bnb = "https://bsc-dataseed.binance.org"
 bsc_testnet = "https://data-seed-prebsc-1-s1.binance.org:8545"
+xlayer = "https://rpc.xlayer.tech"
+xlayer_testnet = "https://testrpc.xlayer.tech/terigon"

 [etherscan]
 base_sepolia = { key = "${BASESCAN_API_KEY}", url = "https://api-sepolia.basescan.org/api" }
 base = { key = "${BASESCAN_API_KEY}", url = "https://api.basescan.org/api" }
 bnb = { key = "${BSCSCAN_API_KEY}", url = "https://api.bscscan.com/api" }
 bsc_testnet = { key = "${BSCSCAN_API_KEY}", url = "https://api-testnet.bscscan.com/api" }
+xlayer = { key = "${OKXSCAN_API_KEY}", url = "https://www.okx.com/api/v5/explorer/contract/verify-source-code" }
```

### Step 2: Set Environment Variables

```bash
# Export trước khi chạy deploy
export DEPLOYER_PRIVATE_KEY="0x..."          # Private key deployer wallet
export ADMIN_ADDRESS="0x..."                  # Admin wallet (multisig hoặc same as deployer)
export OPERATOR_ADDRESS="0x..."               # Backend hot wallet
export USDC_ADDRESS="0x74b7F16337b8972027F6196A17a631aC6dE26d22"   # USDC trên X Layer
export USDT_ADDRESS="0x1E4a5963aBFD975d8c9021ce480b42188849D41d"   # USDT trên X Layer
```

### Step 3: Verify RPC Connection

```bash
# Kiểm tra kết nối tới X Layer mainnet
cast chain-id --rpc-url https://rpc.xlayer.tech
# Kết quả mong đợi: 196

# Kiểm tra balance deployer (OKB)
cast balance $ADMIN_ADDRESS --rpc-url https://rpc.xlayer.tech
# Phải > 0 (cần OKB cho gas)
```

### Step 4: Deploy ClawQuestEscrow

```bash
cd /Users/macbookprom1/Documents/GitHub/clawquest/contracts

# Deploy using existing Deploy.s.sol script
forge script script/Deploy.s.sol \
  --rpc-url https://rpc.xlayer.tech \
  --broadcast \
  --chain-id 196 \
  -vvvv
```

**Output mong đợi:**
```
Deploying ClawQuestEscrow...
  Admin:     0x...
  Operator:  0x...
  USDC:      0x74b7F16337b8972027F6196A17a631aC6dE26d22
  USDT:      0x1E4a5963aBFD975d8c9021ce480b42188849D41d
  Implementation deployed at: 0x...
  Proxy deployed at: 0x...
  USDC added to allowlist
  USDT added to allowlist

=== Deployment Complete ===
Proxy (use this address): 0x...
Implementation:           0x...
```

> [!IMPORTANT]
> **Lưu lại Transaction Hash** từ output — đây chính là TX Hash cần fill vào form hackathon!

### Step 5: Verify TX Hash trên Explorer

Mở URL:
```
https://www.okx.com/web3/explorer/xlayer/tx/0x<YOUR_TX_HASH>
```

Kiểm tra:
- ✅ Status: Success
- ✅ Chain: X Layer (196)
- ✅ Contract address hiện đúng

### Step 6 (Optional): Tạo thêm TX — Interact với Contract

Nếu muốn thêm TX hash, có thể tương tác với contract đã deploy:

```bash
# Kiểm tra token đã được allowlist chưa
cast call <PROXY_ADDRESS> \
  "isTokenAllowed(address)(bool)" \
  "0x74b7F16337b8972027F6196A17a631aC6dE26d22" \
  --rpc-url https://rpc.xlayer.tech
# Kết quả: true
```

---

## Alternatives — Cách Nhanh Nhất Lấy TX Hash

Nếu không kịp deploy full contract, có thể dùng `forge create` trực tiếp:

### Option A: Deploy Contract Đơn Giản (30 giây)

```bash
# Deploy chỉ implementation (không proxy) — nhanh nhất
forge create src/ClawQuestEscrow.sol:ClawQuestEscrow \
  --rpc-url https://rpc.xlayer.tech \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --chain-id 196
```

### Option B: Simple Transfer (10 giây)

```bash
# Gửi 0 OKB tới chính mình — tạo 1 TX đơn giản
cast send $ADMIN_ADDRESS \
  --value 0 \
  --rpc-url https://rpc.xlayer.tech \
  --private-key $DEPLOYER_PRIVATE_KEY
```

> [!WARNING]
> Option B chỉ nên dùng backup nếu hết giờ. Judges đánh giá cao TX từ contract deployment/interaction hơn simple transfer.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `insufficient funds` | Cần thêm OKB vào wallet (gas token X Layer) |
| `chain id mismatch` | Đảm bảo `--chain-id 196` cho mainnet |
| RPC timeout | Thử RPC backup: `https://xlayerrpc.okx.com` |
| `nonce too low` | Add `--nonce <correct_nonce>` (dùng `cast nonce` kiểm tra) |

---

## References

| Resource | URL |
|----------|-----|
| X Layer Docs | [web3.okx.com/xlayer/docs](https://web3.okx.com/xlayer/docs/developer/build-on-xlayer/about-xlayer) |
| Deploy with Foundry | [X Layer Foundry Guide](https://web3.okx.com/xlayer/docs/developer/deploy-a-smart-contract/deploy-with-foundry) |
| X Layer Explorer | [okx.com/web3/explorer/xlayer](https://www.okx.com/web3/explorer/xlayer) |
| Token Addresses | [X Layer Contracts](https://web3.okx.com/xlayer/docs/developer/build-on-xlayer/contracts) |
| Onchain OS Docs | [web3.okx.com/onchainos/dev-docs](https://web3.okx.com/onchainos/dev-docs/home/what-is-onchainos) |
| X Layer RPC Endpoints | [RPC Endpoints](https://web3.okx.com/xlayer/docs/developer/rpc-endpoints/rpc-endpoints) |
