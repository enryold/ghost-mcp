const { ghostApiClient } = require('./build/ghostApi.js');

async function testPostsBrowse() {
    console.log('Testing posts_browse with your parameters...');

    const options = {
        limit: 10,
        order: 'published_at desc',
        include: ['title', 'slug', 'published_at', 'excerpt', 'tags']
    };

    try {
        console.log('Calling ghostApiClient.posts.browse with options:', options);
        const posts = await ghostApiClient.posts.browse(options);
        console.log('Success! Retrieved posts:', JSON.stringify(posts, null, 2));
    } catch (error) {
        console.error('Error details:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
    }
}

testPostsBrowse();