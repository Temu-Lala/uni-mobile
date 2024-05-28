import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Modal, TextInput, Button, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';

const NewsFeed = () => {
  const [newsItems, setNewsItems] = useState([]);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState({});
  const [shareLink, setShareLink] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedPostComments, setSelectedPostComments] = useState([]);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);

  useEffect(() => {
    fetchNewsFeed();
  }, []);

  const fetchNewsFeed = async () => {
    try {
      const responses = await Promise.all([
        fetch('http://10.18.51.32:8000/college-posts/'),
        fetch('http://10.18.51.32:8000/campus-posts/'),
        fetch('http://10.18.51.32:8000/university-posts/'),
        fetch('http://10.18.51.32:8000/department-posts/'),
        fetch('http://10.18.51.32:8000/lecturer-posts/')
      ]);

      if (!responses.every(resp => resp.ok)) {
        throw new Error('Failed to fetch news feed');
      }

      const data = await Promise.all(responses.map(resp => resp.json()));

      const formattedData = data.flatMap((items, index) =>
        items.map(item => formatPostItem(item, ['college', 'campus', 'university', 'department', 'lecturer'][index]))
      );

      setNewsItems(formattedData);
    } catch (error) {
      console.error('Error fetching news feed:', error.message);
      setError('Failed to fetch news feed. Please try again later.');
    }
  };

  const formatPostItem = (item, type) => ({
    id: item.id,
    ownerName: item.owner_name,
    title: item.title,
    content: item.content,
    date: new Date(item.created_at).toLocaleDateString(),
    imageUrls: [item.file],
    fileUrl: item.file,
    likes: item.likes,
    shares: item.shares,
    type,
    comments: [],
    showAllComments: false,
  });

  const toggleComments = async (postId, type) => {
    const postIndex = newsItems.findIndex(item => item.id === postId && item.type === type);
    if (postIndex === -1) return;

    const updatedNewsItems = [...newsItems];
    const post = updatedNewsItems[postIndex];

    post.showAllComments = !post.showAllComments;

    if (post.showAllComments && post.comments.length === 0) {
      try {
        const response = await fetch(`http://10.18.51.32:8000/comments/${type}/${postId}/`);
        if (!response.ok) {
          throw new Error('Failed to fetch comments');
        }
        const data = await response.json();
        post.comments = data.comments;
      } catch (error) {
        console.error('Error fetching comments:', error.message);
        setError('Failed to fetch comments. Please try again later.');
      }
    }

    setNewsItems(updatedNewsItems);
  };

  const handleAddComment = async (postId, type) => {
    try {
      const response = await fetch('http://10.18.51.32:8000/add-comment/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          postType: type,
          commentText: comments[postId]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      setComments({ ...comments, [postId]: '' });
      toggleComments(postId, type);
    } catch (error) {
      console.error('Error adding comment:', error.message);
      setError('Failed to add comment. Please try again later.');
    }
  };

  const handleLikePost = async (postId, type) => {
    try {
      const response = await fetch('http://10.18.51.32:8000/like-post/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          postType: type
        })
      });

      if (!response.ok) {
        throw new Error('Failed to like post');
      }

      fetchNewsFeed();
    } catch (error) {
      console.error('Error liking post:', error.message);
      setError('Failed to like post. Please try again later.');
    }
  };

  const handleSharePost = async (postId, postType) => {
    try {
      const response = await fetch(`http://10.18.51.32:8000/share-post/${postType}/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to share post');
      }
      
      const data = await response.json();
      setShareLink(data.shareLink);
      setShowShareModal(true);
      fetchNewsFeed();
    } catch (error) {
      console.error('Error sharing post:', error.message);
      setError('Failed to share post. Please try again later.');
    }
  };

  const copyLink = async () => {
    try {
      await Sharing.shareAsync(shareLink);
    } catch (error) {
      console.error('Error copying link:', error.message);
      setError('Failed to copy link. Please try again later.');
    }
  };

  const handleCloseShareModal = () => {
    setShowShareModal(false);
  };

  const handleShowCommentsModal = async (postId, type) => {
    try {
      const response = await fetch(`http://10.18.51.32:8000/comments/${type}/${postId}/`);
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      const data = await response.json();
      setSelectedPostComments(data.comments);
      setSelectedPostId(postId);
      setShowCommentsModal(true);
    } catch (error) {
      console.error('Error fetching comments:', error.message);
      setError('Failed to fetch comments. Please try again later.');
    }
  };

  const handleCloseCommentsModal = () => {
    setShowCommentsModal(false);
  };

  return (
    <ScrollView style={styles.container}>
      {error && <Text style={styles.error}>{error}</Text>}
      {newsItems.map(item => (
        <TouchableWithoutFeedback key={item.id} onPress={() => toggleComments(item.id, item.type)}>
          <View style={styles.newsItem}>
            <View style={styles.header}>
              <Text style={styles.ownerName}>{item.ownerName}</Text>
              <Text style={styles.date}>{item.date}</Text>
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.contentText}>{item.content}</Text>
              {item.imageUrls.length > 0 && (
                <View style={styles.imageContainer}>
                  {item.imageUrls.map((url, index) => (
                    <Image key={index} source={{ uri: url }} style={styles.image} />
                  ))}
                </View>
              )}
              {item.fileUrl && (
                <View style={styles.fileContainer}>
                  <Button title="Download File" onPress={() => {}} />
                </View>
              )}
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleLikePost(item.id, item.type)} style={styles.actionButton}>
                  <Icon name="thumbs-up" size={20} color="#007bff" />
                  <Text style={styles.actionButtonText}>{item.likes}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleSharePost(item.id, item.type)} style={styles.actionButton}>
                  <Icon name="share" size={20} color="#007bff" />
                  <Text style={styles.actionButtonText}>{item.shares}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowShareModal(true)} style={styles.actionButton}>
                  <Icon name="copy" size={20} color="#007bff" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.commentsSection}>
              <Text style={styles.toggleButton} onPress={() => handleShowCommentsModal(item.id, item.type)}>
                {item.showAllComments ? 'Hide Comments' : 'Show Comments'}
              </Text>
              <Button title="Add Comment" onPress={() => handleShowCommentsModal(item.id, item.type)} />
            </View>
          </View>
        </TouchableWithoutFeedback>
      ))}
      <Modal visible={showShareModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={handleCloseShareModal} style={styles.closeButton}>
              <Icon name="x" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Share Link</Text>
            <TextInput value={shareLink} style={styles.shareLinkInput} editable={false} />
            <TouchableOpacity onPress={copyLink} style={styles.copyButton}>
              <Text style={styles.copyButtonText}>Copy Link</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={showCommentsModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={handleCloseCommentsModal} style={styles.closeButton}>
              <Icon name="x" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Comments</Text>
            <ScrollView style={styles.commentsScrollView}>
              {selectedPostComments.map(comment => (
                <View key={comment.id} style={styles.comment}>
                  <Image source={{ uri: comment.avatar }} style={styles.commentAvatar} />
                  <View style={styles.commentTextContainer}>
                    <Text style={styles.commentOwner}>{comment.owner}</Text>
                    <Text style={styles.commentBody}>{comment.body}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                value={comments[selectedPostId] || ''}
                onChangeText={text => setComments({ ...comments, [selectedPostId]: text })}
                placeholder="Add a comment"
              />
              <Button title="Add Comment" onPress={() => handleAddComment(selectedPostId, newsItems.find(item => item.id === selectedPostId).type)} />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f5f5f5',
  },
  error: {
    color: 'red',
    marginBottom: 10,
  },
  newsItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  ownerName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  date: {
    color: '#777',
    fontSize: 12,
  },
  content: {
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  contentText: {
    fontSize: 14,
    marginBottom: 10,
    color: '#333',
  },
  imageContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 10,
  },
  fileContainer: {
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    marginLeft: 5,
    color: '#007bff',
  },
  commentsSection: {
    marginTop: 10,
  },
  toggleButton: {
    marginBottom: 10,
    color: '#007bff',
    fontSize: 14,
  },
  comment: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  commentTextContainer: {
    flex: 1,
  },
  commentOwner: {
    fontWeight: 'bold',
  },
  commentBody: {
    color: '#555',
  },
  commentInputContainer: {
    marginTop: 10,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  shareLinkInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  copyButton: {
    backgroundColor: '#007bff',
    borderRadius: 5,
    padding: 10,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  commentsScrollView: {
    maxHeight: 200,
  },
});

export default NewsFeed;
