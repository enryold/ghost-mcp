#!/usr/bin/env node

// Temporary test file to check Ghost Admin API functionality
// This file tests if we can get post members by ID using the Ghost Admin API

require('dotenv').config();
const { ghostAdminApiClient, getPostById } = require('./build/ghostApi');

async function testAdminAPI() {
    console.log('🧪 Testing Ghost Admin API...\n');

    // Check if Admin API is available
    if (!ghostAdminApiClient) {
        console.log('❌ Ghost Admin API client not available. Make sure GHOST_ADMIN_API_KEY is set in your environment.');
        process.exit(1);
    }

    console.log('✅ Ghost Admin API client initialized\n');

    try {
        // Test 1: Get all posts using Admin API
        console.log('📋 Test 1: Fetching posts with Admin API...');
        const posts = await ghostAdminApiClient.posts.browse({ limit: 5, include: 'tags,authors' });
        console.log(`✅ Found ${posts.length} posts`);

        if (posts.length > 0) {
            const firstPost = posts[0];
            console.log(`   Sample post: "${firstPost.title}" (ID: ${firstPost.id})`);
            console.log(`   Visibility: ${firstPost.visibility}`);
            console.log(`   Status: ${firstPost.status}\n`);

            // Test 2: Get specific post by ID with member content
            console.log('📄 Test 2: Fetching specific post with member content...');
            const postById = await getPostById(firstPost.id, true);
            console.log(`✅ Successfully retrieved post: "${postById.title}"`);
            console.log(`   HTML content length: ${postById.html ? postById.html.length : 0} characters`);
            console.log(`   Member access: ${postById.visibility === 'members' ? 'Required' : 'Not required'}\n`);

            // Test 3: Check if we can access member-only content
            console.log('👥 Test 3: Looking for member-only posts...');
            const memberPosts = await ghostAdminApiClient.posts.browse({
                filter: 'visibility:members',
                limit: 3
            });

            if (memberPosts.length > 0) {
                console.log(`✅ Found ${memberPosts.length} member-only posts`);
                memberPosts.forEach(post => {
                    console.log(`   - "${post.title}" (${post.visibility})`);
                });

                // Test 4: Check if we can get the full content of member posts
                console.log('\n📖 Test 4: Testing member post content access...');
                const memberPost = memberPosts[0];
                try {
                    const memberPostWithContent = await getPostById(memberPost.id, true);
                    const hasContent = memberPostWithContent.html && memberPostWithContent.html.length > 0;

                    if (hasContent) {
                        console.log(`✅ Successfully retrieved member post content`);
                        console.log(`   Post: "${memberPostWithContent.title}"`);
                        console.log(`   Content length: ${memberPostWithContent.html.length} characters`);
                        console.log(`   Visibility: ${memberPostWithContent.visibility}`);
                    } else {
                        console.log(`⚠️  Member post retrieved but no content found`);
                        console.log(`   Post: "${memberPostWithContent.title}"`);
                        console.log(`   Visibility: ${memberPostWithContent.visibility}`);
                    }
                } catch (memberError) {
                    console.error(`❌ Failed to get member post content: ${memberError.message}`);
                }
            } else {
                console.log('ℹ️  No member-only posts found');
            }

        } else {
            console.log('ℹ️  No posts found to test with');
        }

        console.log('\n🎉 All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response && error.response.data) {
            console.error('Error details:', error.response.data);
        }
        process.exit(1);
    }
}

// Run the test
testAdminAPI().catch(console.error);