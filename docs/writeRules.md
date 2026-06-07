# 索引脚本规则

## oasis query 查询规则

### 1.合约事件查询

- **解码**：由于当前的合约是代理合约，合约的事件不是标准的，所以需要对合约事件进行解码，才能获得可阅读的事件信息, 解码应该移除`raw.body`(原始事件参数)。
- **倒序排列**：在oasis sapphire 上查询合约事件得到的数据是按blockNumber倒序排列的，即最新的事件在前，旧的事件在后，所以需要将数据进行倒序排列。

### 2.写入规则

- **写入顺序约束**：仅仅进行倒序排列是不够的，因为很多事件是需要依赖其他事件的，所以有些事件类型应该先处理。
  1. **BlindBox合约**：首先处理`BoxCreated`事件，然后处理其它事件，最后处理`BoxStatusChanged`事件。
  2. **Exchange合约**：首先处理`BoxListed`事件，然后处理`BoxPurchased`和`BoxBidPlaced`事件，其它事件可以不需要约束。
  3. **FundManager合约**：首先处理`Payment`事件，然后处理`RewardAdded`事件，其他事件可以不需要约束。

- **insert or update**：部分表数据需要先确保数据存在，然后才能再次写入，比如：
  1. 如果events参数中有boxId，那么即必须保证相应的boxes表数据存在，
  2. 如果events参数中有userId，那么即必须保证相应的users表数据存在
  3. 如果events参数中有address，那么即必须保证相应的userAddress表数据存在

### 3.元数据查询

- **获取方式**：通过合约事件中的boxInfoCID获取元数据的CID。
- **获取元数据**：通过ipfs网关获取元数据，并解析json数据。

### 4.特别注意

- **错误事件**：有部分合约事件是错误的，需要进行更正，这是由于此前的合约代码存在bug，导致事件参数错误，需要手动更正，请查看`eventSyncScript\src\utils\fixEventsErrorParam.ts`。
