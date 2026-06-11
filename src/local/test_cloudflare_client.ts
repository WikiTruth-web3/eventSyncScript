import '../config/env';
import { db } from '../config/db.client';

async function test() {
    console.log('--- Testing Cloudflare Client Facade ---');
    const client = db;

    // 1. Test upsert sync status
    console.log('\n[Test 1] Upsert sync_status...');
    const upsertRes = await client.upsert('sync_status', {
        network: 'testnet',
        layer: 'sapphire',
        contract_name: 'BLIND_BOX',
        last_synced_block: '5566'
    });
    console.log('Upsert status result:', upsertRes);

    // 2. Test single select sync status
    console.log('\n[Test 2] Single select sync_status...');
    const selectRes = await client.getSyncStatus('testnet', 'sapphire', 'BLIND_BOX');
    console.log('Select single result:', JSON.stringify(selectRes));

    // 3. Test list select sync status
    console.log('\n[Test 3] List select sync_status...');
    const listRes = await client.getSyncStatus('testnet', 'sapphire');
    console.log('Select list result:', JSON.stringify(listRes));

    // 4a. Upsert user first to satisfy foreign key
    console.log('\n[Test 4a] Upsert user for FK constraint...');
    const userRes = await client.upsert('users', {
        network: 'testnet',
        layer: 'sapphire',
        id: '0xuser_test'
    });
    console.log('Upsert user result:', userRes);

    // 4b. Test upsert box
    console.log('\n[Test 4b] Upsert box...');
    const boxRes = await client.upsert('boxes', {
        network: 'testnet',
        layer: 'sapphire',
        id: '200',
        token_id: '200',
        minter_id: '0xuser_test',
        status: 1,
        create_timestamp: '1720000000',
        deadline: '1720000000',
        box_info_cid: null
    });
    console.log('Upsert box result:', boxRes);

    // 5. Test update box status using match
    console.log('\n[Test 5] Update box using match...');
    const updateRes = await client.update('boxes', { status: 3 }, { network: 'testnet', layer: 'sapphire', id: '200' });
    console.log('Update box result:', updateRes);
}

test().catch(console.error);
