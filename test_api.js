async function testAPI() {
  try {
    console.log('Testing GET /api/insert_activity');
    const res = await fetch('http://127.0.0.1:3000/api/insert_activity');
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Data:', data);

    console.log('\nTesting POST /api/insert_activity');
    const postRes = await fetch('http://127.0.0.1:3000/api/insert_activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: '1', description: 'test activity' })
    });
    const postData = await postRes.json();
    console.log('Status:', postRes.status);
    console.log('Data:', postData);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

testAPI();