// Clear credit entries from localStorage
// Run this in browser console to force a fresh sync from DynamoDB

console.log('🧹 Clearing credit entries from localStorage...');

// Clear credit entries
localStorage.removeItem('vyapar-credit-entries');
console.log('✅ Cleared: vyapar-credit-entries');

// Clear sync status
localStorage.removeItem('vyapar-credit-sync-status');
console.log('✅ Cleared: vyapar-credit-sync-status');

console.log('');
console.log('🔄 Now refresh the page to sync from DynamoDB');
console.log('');
console.log('The app will automatically pull all 60 credit entries from the cloud!');
