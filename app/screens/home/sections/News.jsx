import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  StyleSheet,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';

const NewsFeed = () => {
  const [newsItems, setNewsItems] = useState([]);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState({});
  const [shareLink, setShareLink] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedPostComments, setSelectedPostComments] = useState([]);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [userAvatar, setUserAvatar] = useState('');
  const [zoomModalVisible, setZoomModalVisible] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState('');

  const socket = useRef(null);

  useEffect(() => {
    fetchNewsFeed();
    getToken();
    setupSocket();
  }, []);

  const setupSocket = () => {
    socket.current = io('http://10.18.51.16:8000'); // Replace with your backend WebSocket URL
    socket.current.on('new_comment', handleNewComment);
    socket.current.on('new_like', handleNewLike);
  };

  const handleNewComment = (data) => {
    const { postId, comment } = data;
    const postIndex = newsItems.findIndex((item) => item.id === postId);
    if (postIndex !== -1) {
      const updatedNewsItems = [...newsItems];
      updatedNewsItems[postIndex].comments.push(comment);
      setNewsItems(updatedNewsItems);
      if (postId === selectedPostId) {
        setSelectedPostComments([...selectedPostComments, comment]);
      }
    }
  };

  const handleNewLike = (data) => {
    const { postId } = data;
    const postIndex = newsItems.findIndex((item) => item.id === postId);
    if (postIndex !== -1) {
      const updatedNewsItems = [...newsItems];
      updatedNewsItems[postIndex].likes += 1;
      setNewsItems(updatedNewsItems);
    }
  };

  const getToken = async () => {
    const storedToken = await AsyncStorage.getItem('token');
    setToken(storedToken);
    const storedAvatar = await AsyncStorage.getItem('userAvatar');
    setUserAvatar(storedAvatar || 'https://example.com/default-avatar.jpg');
  };

  const fetchNewsFeed = async () => {
    setLoading(true);
    try {
      const responses = await Promise.all([
        fetch('http://10.18.51.16:8000/college-posts/'),
        fetch('http://10.18.51.16:8000/campus-posts/'),
        fetch('http://10.18.51.16:8000/university-posts/'),
        fetch('http://10.18.51.16:8000/department-posts/'),
        fetch('http://10.18.51.16:8000/lecturer-posts/'),
      ]);

      if (!responses.every((resp) => resp.ok)) {
        throw new Error('Failed to fetch news feed');
      }

      const data = await Promise.all(responses.map((resp) => resp.json()));

      const formattedData = data.flatMap((items, index) =>
        items.map((item) =>
          formatPostItem(item, ['college', 'campus', 'university', 'department', 'lecturer'][index])
        )
      );

      setNewsItems(formattedData);
    } catch (error) {
      console.error('Error fetching news feed:', error.message);
      setError('Failed to fetch news feed. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const formatPostItem = (item, type) => ({
    id: `${type}-${item.id}`,
    ownerName: item.owner_name,
    ownerAvatar: item.owner_avatar,
    title: item.title,
    content: item.content,
    date: new Date(item.created_at).toLocaleDateString(),
    imageUrls: item.file ? [item.file] : [], // Ensure file is an array
    fileUrl: item.file,
    likes: item.likes,
    shares: item.shares,
    type,
    comments: [],
    showAllComments: false,
    expanded: false,
  });

  const toggleComments = async (postId, type) => {
    const postIndex = newsItems.findIndex((item) => item.id === postId && item.type === type);
    if (postIndex === -1) return;

    const updatedNewsItems = [...newsItems];
    const post = updatedNewsItems[postIndex];

    post.showAllComments = !post.showAllComments;

    if (post.showAllComments && post.comments.length === 0) {
      try {
        const response = await fetch(`http://10.18.51.16:8000/comments/${type}/${postId.split('-')[1]}/`);
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
    if (!token) {
      Alert.alert('Error', 'You must be logged in to add a comment.');
      return;
    }

    try {
      const response = await fetch('http://10.18.51.16:8000/add-comment/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          postId: postId.split('-')[1],
          postType: type,
          commentText: comments[postId],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const newComment = await response.json();
      socket.current.emit('new_comment', { postId, comment: newComment });

      setComments({ ...comments, [postId]: '' });
      handleNewComment({ postId, comment: newComment });
    } catch (error) {
      console.error('Error adding comment:', error.message);
      setError('Failed to add comment. Please try again later.');
    }
  };

  const handleLikePost = async (postId, type) => {
    if (!token) {
      Alert.alert('Error', 'You must be logged in to like a post.');
      return;
    }

    try {
      const response = await fetch('http://10.18.51.16:8000/like-post/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          postId: postId.split('-')[1],
          postType: type,
        }),
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
    if (!token) {
      Alert.alert('Error', 'You must be logged in to share a post.');
      return;
    }

    try {
      const response = await fetch(`http://10.18.51.16:8000/share-post/${postType}/${postId.split('-')[1]}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
      const response = await fetch(`http://10.18.51.16:8000/comments/${type}/${postId.split('-')[1]}/`);
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

  const toggleExpand = (postId) => {
    setNewsItems(newsItems.map(item => {
      if (item.id === postId) {
        return { ...item, expanded: !item.expanded };
      }
      return item;
    }));
  };

  const handleZoomImage = (url) => {
    setZoomImageUrl(url);
    setZoomModalVisible(true);
  };

  const handleCloseZoomModal = () => {
    setZoomModalVisible(false);
    setZoomImageUrl('');
  };

  return (
    <ScrollView style={styles.container}>
      {loading && <ActivityIndicator size="large" color="#0000ff" />}
      {error && <Text style={styles.error}>{error}</Text>}
      {newsItems.map((item) => (
        <TouchableWithoutFeedback key={item.id} onPress={() => toggleComments(item.id, item.type)}>
          <View style={styles.newsItem}>
            <View style={styles.header}>
              <Image source={{ uri: item.ownerAvatar }} style={styles.avatar} />
              <View style={styles.headerText}>
                <Text style={styles.ownerName}>{item.ownerName}</Text>
                <Text style={styles.date}>{item.date}</Text>
              </View>
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.contentText} numberOfLines={item.expanded ? undefined : 3}>
                {item.content}
              </Text>
              {!item.expanded && item.content.length > 100 && (
                <Text onPress={() => toggleExpand(item.id)} style={styles.seeMoreText}>
                  See More
                </Text>
              )}
              {item.imageUrls.length > 0 && (
                <View style={styles.imageContainer}>
                  {item.imageUrls.map((url, index) => (
                    <TouchableOpacity key={index} onPress={() => handleZoomImage(url)}>
                      <Image source={{ uri: url }} style={styles.image} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {item.fileUrl && (
                <View style={styles.fileContainer}>
                  <TouchableOpacity onPress={() => handleZoomImage(item.fileUrl)} style={styles.downloadButton}>
                    <Image source={{ uri: item.fileUrl }} style={styles.smallImage} />
                    <Text style={styles.downloadButtonText}>View File</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleLikePost(item.id, item.type)} style={styles.actionButton}>
                  <Icon name="thumbs-up" size={20} color="#007bff" />
                  <Text style={styles.actionButtonText}>{item.likes}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleSharePost(item.id, item.type)} style={styles.actionButton}>
                  <Icon name="share" size={20} color="#28a745" />
                  <Text style={styles.actionButtonText}>{item.shares}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleShowCommentsModal(item.id, item.type)}
                  style={styles.actionButton}
                >
                  <Icon name="message-circle" size={20} color="#17a2b8" />
                  <Text style={styles.actionButtonText}>{item.comments.length}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      ))}

      <Modal visible={showShareModal} onRequestClose={handleCloseShareModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>Share this post:</Text>
            <TextInput style={styles.shareLink} value={shareLink} editable={false} />
            <TouchableOpacity onPress={copyLink} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>Copy Link</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCloseShareModal} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCommentsModal} onRequestClose={handleCloseCommentsModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={handleCloseCommentsModal}>
              <Icon name="x" size={30} color="#000" />
            </TouchableOpacity>
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
            <View style={styles.addCommentContainer}>
              <Image source={{ uri: userAvatar }} style={styles.commentAvatar} />
              <TextInput
                style={styles.commentInput}
                value={comments[selectedPostId] || ''}
                onChangeText={(text) => setComments({ ...comments, [selectedPostId]: text })}
                placeholder="Add a comment..."
              />
              <TouchableOpacity onPress={() => handleAddComment(selectedPostId, selectedPostId.split('-')[0])}>
                <Icon name="send" size={24} color="#007bff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={zoomModalVisible} onRequestClose={handleCloseZoomModal} transparent animationType="slide">
        <View style={styles.zoomModalContainer}>
          <Image source={{ uri: zoomImageUrl }} style={styles.zoomImage} />
          <TouchableOpacity style={styles.closeButton} onPress={handleCloseZoomModal}>
            <Icon name="x" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f0f2f5',
  },
  newsItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#ccc',
  },
  headerText: {
    flex: 1,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 14,
    color: '#666',
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
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  seeMoreText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: 200,
    marginBottom: 5,
  },
  fileContainer: {
    marginBottom: 10,
    alignItems: 'center', // Center the image
  },
  smallImage: {
    width: 100, // Adjust the size as needed
    height: 100,
    marginBottom: 5,
  },
  downloadButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center', // Center the content
  },
  downloadButtonText: {
    color: '#fff',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    marginLeft: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  modalText: {
    fontSize: 18,
    marginBottom: 10,
  },
  shareLink: {
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  modalButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    marginVertical: 5,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    textAlign: 'center',
  },
  commentsScrollView: {
    width: '100%',
    marginBottom: 10,
  },
  comment: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    alignItems: 'flex-start',
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
    marginBottom: 5,
  },
  commentBody: {
    color: '#333',
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    padding: 10,
  },
  commentInput: {
    flex: 1,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingLeft: 15,
    paddingRight: 15,
    marginRight: 10,
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  zoomModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  zoomImage: {
    width: '90%',
    height: '80%',
    resizeMode: 'contain',
  },
});

export default NewsFeed;
