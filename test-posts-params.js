const { ghostApiClient, ghostAdminApiClient, getPosts } = require('./build/ghostApi');

async function testPostsParams() {
    console.log('🧪 Testing posts with specific parameters...');

    // Test the exact parameters that are failing
    const options = {
        limit: 10,
        order: 'published_at DESC'
    };

    console.log('Testing options:', options);

    try {
        // Test with content API first
        console.log('📖 Testing with Content API...');
        const contentApiPosts = await ghostApiClient.posts.browse(options);
        console.log('✅ Content API success:', contentApiPosts.length, 'posts');

        // Test with admin API
        if (ghostAdminApiClient) {
            console.log('📖 Testing with Admin API (directly)...');
            const adminApiPosts = await ghostAdminApiClient.posts.browse(options);
            console.log('✅ Admin API direct success:', adminApiPosts.length, 'posts');

            // Test with our getPosts wrapper
            console.log('📖 Testing with getPosts wrapper...');
            const wrapperPosts = await getPosts(options);
            console.log('✅ getPosts wrapper success:', wrapperPosts.length, 'posts');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Full error:', error);
    }
}

testPostsParams();