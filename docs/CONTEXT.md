# Evidence Market Event Sync — 项目上下文

## 项目定位

区块链事件同步脚本，从 **Oasis Sapphire** 链（testnet `23295` / mainnet `23294`）拉取 Evidence Market 协议合约事件，解码后写入 **Supabase** 数据库，并可选从 **IPFS** 获取元数据。

## 技术栈

- **Runtime**: Node.js 20+, TypeScript, tsx
- **链交互**: `viem`, `@oasisprotocol/client`, Oasis Nexus API
- **数据库**: Supabase (PostgreSQL) via `@supabase/supabase-js`
- **IPFS**: 多网关自动降级（Pinata, ipfs.io, Cloudflare, dweb.link 等）
- **CI**: GitHub Actions（已禁用）

## 目录结构

```
src/
├── index.ts                    # 入口：按控制器配置依次同步各合约
├── controller.ts               # 运行模式配置（是否写库、是否重启、同步合约列表）
│
├── config/                     # 公共配置（Supabase客户端、同步参数、IPFS、代理、环境变量）
├── contractsConfig/            # 合约定义（地址、事件签名、协议常量）
│
├── sync-engine/                # 同步引擎（核心基础设施）
│   ├── events/                 #   区块事件抓取（Oasis Nexus API）
│   ├── state/                  #   同步游标管理（Supabase sync_status 表）
│   └── sync/                   #   同步编排（游标→抓取→返回结果）
│
├── scripts/                    # 按合约的同步脚本（fetch + 解码 + 持久化）
│
├── services/                   # 业务写入逻辑
│   ├── writer/                 #   各合约事件写入 Supabase（blindBox、exchange、fundManager 等）
│   └── ipfs/                   #   IPFS 元数据获取
│
├── utils/                      # 工具函数
│   ├── decodeEvents.ts         #   合约事件解码（ABI解码，移除 body）
│   ├── fixEventsErrorParam.ts  #   错误事件参数修正
│   ├── eventArgs.ts            #   安全提取事件参数
│   ├── extractTimestamp.ts     #   区块时间戳提取
│   ├── generateId.ts           #   记录唯一 ID 生成
│   ├── getBoolean.ts           #   布尔值健壮转换
│   ├── bigInt.ts               #   BigInt 序列化
│   ├── fetchWithProxy.ts       #   代理请求工具
│   └── ipfsUrl/                #   IPFS CID → 网关 URL 转换（多网关自动降级）
│
├── dev-tools/                  # 开发者工具（本地调试用）
│   ├── saveEventDataToFile.ts  #   拉取到的原始事件保存为 JSON 文件
│   ├── downloadIpfsFile.ts     #   手动下载 IPFS 文件到本地
│   ├── decodeEventsExample.ts  #   事件解码示例脚本
│   ├── checkDecode.ts          #   解码结果验证工具
│   └── processFile.ts          #   本地文件处理工具
│
└── oasisQuery/                 # Oasis Nexus API SDK（封装链上查询接口）
```

## 入口与调度

`src/index.ts` → 读取 `src/controller.ts` 配置 → 按合约顺序执行同步。

控制器字段：
- `writeToSupabase` — 是否写入数据库
- `restart` — 是否忽略已有同步进度，从头开始
- `isUpdateLastBlock` — 是否更新游标
- `queryList` — 要同步的合约列表

## 核心数据流

```
index.ts
 ├─ controller.ts（运行模式配置）
 ├─ sync_status 表（读取上次同步区块）
 │
 ├─ fetchBlindBoxEvents / fetchExchangeEvents / ...（按合约）
 │    ├─ sync-engine/sync/ → 读取游标 → 分批拉取事件
 │    │    └─ sync-engine/events/ → Oasis Nexus API
 │    ├─ utils/decodeEvents.ts（解码代理合约事件，移除 body）
 │    ├─ services/writer/*Writer.ts（写入数据库）
 │    │    ├─ ensureUsersId.ts（确保 users 表存在关联用户）
 │    │    └─ services/ipfs/metadataWriter.ts（IPFS 元数据写入）
 │    └─ 更新 sync_status 游标
 ```

## 涉及的合约

| 合约 | 主要事件 | 职责 |
|---|---|---|
| **BlindBox** | BoxCreated, BoxStatusChanged, PriceChanged, DeadlineChanged | 证据箱（box）全生命周期 |
| **Exchange** | BoxListed, BoxPurchased, BidPlaced, CompleterAssigned, RequestDeadlineChanged, ArbitrationDeadineChanged, RefundPermitChanged | 市场：挂单、购买、竞价、完成、退款 |
| **FundManager** | Payment, OrderAmountWithdraw, RefundAmountWithdraw, RewardAdded, RewardWithdraw | 支付处理、奖励分发 |
| **UserManager** | Blacklisted | 用户黑名单 |
| **Forwarder** | Paused, Unpaused | 代理合约暂停状态 |
<!-- | **BoxNFT** | Transfer（暂不活跃） | NFT 所有权 | -->

## 数据库表

| 表 | 写入场景 |
|---|---|
| `sync_status` | 同步游标（network/contract → last_block） |
| `boxes` | BoxCreated 创建，后续事件更新字段 |
| `metadata_boxes` | IPFS 元数据 (BoxCreated) |
| `users` | 从事件 userId 自动 ensure 存在 |
| `user_addresses` | 用户地址 + 黑名单状态 |
| `box_bidders` | BidPlaced |
| `payments` | Payment |
| `withdraws` | OrderAmountWithdraw / RewardWithdraw |
| `rewards_addeds` | RewardAdded |
| `fund_manager_state` | Paused / Unpaused |
| `forwarder_state` | Paused / Unpaused |

*由数据库触发器自动维护的衍生表：`box_rewards`, `user_rewards`, `user_withdraws`, `box_user_order_amounts`, `statistical_state`, `token_total_amounts`*

## 写入顺序约束（依赖关系）

写入时必须保证依赖数据先存在。参见 `docs/writeRules.md`：

1. 事件中有 `boxId` → 确保 `boxes` 表已有该 box
2. 事件中有 `userId` → 确保 `users` 表已有该用户
3. 事件中有 `address` → 确保 `user_addresses` 表已有该地址

## 关键功能模块

### 事件解码（`utils/decodeEvents.ts`）
BlindBox/Exchange/FundManager 使用代理模式，事件非标准，无法被 Oasis Nexus 自动解码。通过 `contractsConfig/eventSignatures/events.ts` 中配置的事件签名，使用 ABI 手动解码原始事件参数。解码后自动移除 `body` 字段以减小数据体积。

### 事件数据保存为 JSON（`dev-tools/saveEventDataToFile.ts`）
当环境变量 `EVENT_SYNC_SAVE_JSON=true` 时，每次拉取的原始事件数据会保存到 `data/rawEvents/` 目录作为 JSON 文件，便于离线调试和问题排查。

### IPFS 文件下载（`dev-tools/downloadIpfsFile.ts`）
独立 CLI 工具，通过合约事件中的 `boxInfoCID` 从 IPFS 网关下载元数据文件到本地，支持多网关自动降级（Pinata、ipfs.io、Cloudflare、dweb.link 等）。

## 特殊处理

- **Nexus 倒序**：Oasis Nexus 返回事件按 blockNumber 倒序，需翻转后再写入
- **BigInt 序列化**：所有 BigInt 在写入 Supabase 前转为字符串

## 配置

环境变量（`.env` / `.env.local`）：
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `EVENT_SYNC_USE_PROXY`, `EVENT_SYNC_SAVE_JSON`
- `EVENT_SYNC_FROM_BLOCK`, `EVENT_SYNC_LIMIT`, `EVENT_SYNC_BATCH_SIZE`
