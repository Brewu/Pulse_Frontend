import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { conversationsAPI, messagesAPI, messagesRealTime, getSocket, usersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './MessagePage.css';

const MessagePage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Refs to prevent infinite loops
  const lastMarkedReadRef = useRef(null);
  const lastSelectedConvRef = useRef(null);

  // UI State
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark' ||
      (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounceTimeout, setSearchDebounceTimeout] = useState(null);
  const [chatFilter, setChatFilter] = useState('all');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [isArchived, setIsArchived] = useState(false);
  const [showMessageOptions, setShowMessageOptions] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const optionsRef = useRef(null);

  // ==================== PUSH NOTIFICATION HELPER ====================
  // In MessagePage.js, update the sendPushNotification function:

  // In MessagePage.js, update the sendPushNotification function:

  // In MessagePage.js, update the sendPushNotification function:

  // In MessagePage.js, update the sendPushNotification function:

  const sendPushNotification = useCallback(async (userId, notificationData) => {
    try {
      if (!userId) {
        console.log('❌ Cannot send push notification: No userId provided');
        return;
      }

      console.log('\n📨 ===== PUSH NOTIFICATION ATTEMPT =====');
      console.log(`📍 Timestamp: ${new Date().toLocaleTimeString()}`);
      console.log(`👤 Sender: ${user?.username || user?.id || 'Unknown'}`);
      console.log(`👤 Recipient ID: ${userId}`);
      console.log(`📋 Notification Title: "${notificationData.title}"`);
      console.log(`📋 Notification Body: "${notificationData.body}"`);
      console.log(`📋 Additional Data:`, notificationData.data || {});

      // Check if notification has message preview
      if (notificationData.data?.messagePreview) {
        console.log(`💬 Message Preview: "${notificationData.data.messagePreview}"`);
      }

      const url = `https://pulse-backend-tpg8.onrender.com/api/push/message/${userId}`;
      console.log(`🌐 API Endpoint: ${url}`);

      const token = localStorage.getItem('token');
      console.log(`🔑 Auth Token present: ${token ? 'Yes (starts with ' + token.substring(0, 10) + '...)' : 'No'}`);

      const startTime = Date.now();

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notificationData)
      });

      const responseTime = Date.now() - startTime;
      console.log(`⏱️ Response time: ${responseTime}ms`);
      console.log(`📡 Response status: ${response.status} ${response.statusText}`);

      const data = await response.json();
      console.log(`📦 Response data:`, data);

      if (response.ok) {
        if (data.sentCount > 0) {
          console.log(`✅ SUCCESS: Push notification sent to ${data.sentCount} device(s)`);
          if (data.totalDevices) {
            console.log(`   📱 Devices: ${data.sentCount}/${data.totalDevices} successful`);
          }
          if (data.details) {
            console.log(`   📊 Details:`, data.details);
          }
        } else {
          console.log(`ℹ️ No devices to notify: ${data.message || 'User has no active subscriptions'}`);
        }
      } else {
        console.log(`❌ FAILED: ${data.error || 'Unknown error'}`);
        if (data.error === 'You can only send messages to users you have a conversation with') {
          console.log(`   ⚠️ Users are not mutual followers or conversation is archived`);
        }
      }

      console.log('=====================================\n');

      return data;
    } catch (error) {
      console.error('\n❌ ERROR sending push notification:', error);
      console.log('=====================================\n');
    }
  }, [user]);

  // Theme toggle
  const toggleTheme = () => {
    setIsDark(prev => {
      const newTheme = !prev;
      localStorage.setItem('theme', newTheme ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
      return newTheme;
    });
  };

  // Initialize theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        setShowMessageOptions(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ========== QUERIES ==========
  const { data: activeConversationsData, isLoading: activeLoading } = useQuery({
    queryKey: ['conversations', 'active'],
    queryFn: async () => {
      const response = await conversationsAPI.getActive();
      return { data: response.data?.data || [] };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: archivedConversationsData, isLoading: archivedLoading } = useQuery({
    queryKey: ['conversations', 'archived'],
    queryFn: async () => {
      const response = await conversationsAPI.getArchived();
      return { data: response.data?.data || [] };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: pinnedConversationsData, isLoading: pinnedLoading } = useQuery({
    queryKey: ['conversations', 'pinned'],
    queryFn: async () => {
      const response = await conversationsAPI.getPinned();
      return { data: response.data?.data || [] };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: mutualFollowersData, isLoading: mutualFollowersLoading } = useQuery({
    queryKey: ['mutualFollowers'],
    queryFn: async () => {
      const response = await usersAPI.getFollowing(user?.id, 1, 1000);
      const following = response.data?.data || [];
      const mutualFollowers = following.filter(f => f.isFollowingBack === true);
      return { data: mutualFollowers };
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const { data: searchResultsData, isLoading: searchLoading, refetch: searchUsers } = useQuery({
    queryKey: ['searchUsers', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return { data: [] };
      const response = await usersAPI.search(searchQuery);
      const users = response.data?.data || [];
      const mutualUsers = users.filter(u => u.isMutual === true);
      return { data: mutualUsers };
    },
    enabled: false,
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedConversation?._id],
    queryFn: async () => {
      if (!selectedConversation?._id) return { data: [] };
      const response = await messagesAPI.getAll(selectedConversation._id, { limit: 50 });
      setIsArchived(!!response.data?.meta?.isArchived);
      return { data: response.data?.data || [] };
    },
    enabled: !!selectedConversation?._id,
    staleTime: 1 * 60 * 1000,
  });

  const { data: unreadCountData } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: async () => {
      const response = await conversationsAPI.getUnreadCount();
      return { total: response.data?.data?.totalUnread || 0 };
    },
    refetchInterval: 30000,
  });

  // ========== COMBINED & FILTERED CONVERSATIONS ==========
  const getAllConversations = useCallback(() => {
    const active = activeConversationsData?.data || [];
    const archived = archivedConversationsData?.data || [];
    const pinned = pinnedConversationsData?.data || [];

    const allIds = new Set();
    const all = [];

    pinned.forEach(conv => {
      if (conv?._id && !allIds.has(conv._id)) {
        allIds.add(conv._id);
        all.push({ ...conv, isPinned: true });
      }
    });

    active.forEach(conv => {
      if (conv?._id && !allIds.has(conv._id)) {
        allIds.add(conv._id);
        all.push(conv);
      }
    });

    archived.forEach(conv => {
      if (conv?._id && !allIds.has(conv._id)) {
        allIds.add(conv._id);
        all.push({ ...conv, isArchived: true });
      }
    });

    return all;
  }, [activeConversationsData, archivedConversationsData, pinnedConversationsData]);

  const getFilteredConversations = useCallback(() => {
    let conversations = getAllConversations();

    if (chatFilter === 'active') conversations = conversations.filter(c => !c.isArchived);
    else if (chatFilter === 'archived') conversations = conversations.filter(c => c.isArchived);
    else if (chatFilter === 'pinned') conversations = conversations.filter(c => c.isPinned);

    if (sidebarSearch.trim()) {
      const term = sidebarSearch.toLowerCase();
      conversations = conversations.filter(conv => {
        const p = conv.otherParticipant;
        return p?.name?.toLowerCase().includes(term) || p?.username?.toLowerCase().includes(term);
      });
    }

    return conversations.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0);
    });
  }, [getAllConversations, chatFilter, sidebarSearch]);

  const getMutualFollowersWithoutConversation = useCallback(() => {
    const convUserIds = new Set(getAllConversations().map(c => c.otherParticipant?._id).filter(Boolean));
    let followers = (mutualFollowersData?.data || []).filter(f => !convUserIds.has(f._id));

    if (sidebarSearch.trim()) {
      const term = sidebarSearch.toLowerCase();
      followers = followers.filter(f =>
        f.name?.toLowerCase().includes(term) || f.username?.toLowerCase().includes(term)
      );
    }

    return followers;
  }, [getAllConversations, mutualFollowersData?.data, sidebarSearch]);

  // ========== MUTATIONS ==========
  const createConversationMutation = useMutation({
    mutationFn: userId => conversationsAPI.create(userId),
    onSuccess: (response) => {
      const newConv = response.data?.data;
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['mutualFollowers'] });
      setShowNewMessageModal(false);
      setSearchQuery('');
      setSelectedConversation(newConv);
      setIsArchived(false);
      navigate(`/messages/${newConv._id}`);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ conversationId, content }) => messagesAPI.send(conversationId, { content }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation?._id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setMessageInput('');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

      // Send push notification to the other participant
      if (selectedConversation?.otherParticipant) {
        sendPushNotification(selectedConversation.otherParticipant._id, {
          title: `💬 New message from ${user?.name || user?.username}`,
          body: variables.content.substring(0, 100) + (variables.content.length > 100 ? '...' : ''),
          type: 'message',
          icon: '/icons/message-icon.png',
          badge: '/badge-message.png',
          data: {
            url: `/messages/${selectedConversation._id}`,
            conversationId: selectedConversation._id,
            senderId: user?.id,
            senderName: user?.name,
            senderUsername: user?.username,
            messagePreview: variables.content.substring(0, 50),
          }
        }).catch(console.error);
      }
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: conversationId => messagesAPI.markConversationRead(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: conversationsAPI.archive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['mutualFollowers'] });
      setIsArchived(true);
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: conversationsAPI.unarchive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['mutualFollowers'] });
      setIsArchived(false);
    },
  });

  const pinMutation = useMutation({
    mutationFn: conversationsAPI.pin,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });

  const unpinMutation = useMutation({
    mutationFn: conversationsAPI.unpin,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });

  const deleteConversationMutation = useMutation({
    mutationFn: conversationsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['mutualFollowers'] });
      setSelectedConversation(null);
      navigate('/messages');
    },
  });

  const deleteMessageForMeMutation = useMutation({
    mutationFn: ({ conversationId, messageId }) => messagesAPI.deleteForMe(conversationId, messageId),
    onSuccess: (_, { conversationId, messageId }) => {
      queryClient.setQueryData(['messages', conversationId], old => ({
        ...old,
        data: old.data.map(m => m._id === messageId ? { ...m, isDeletedForMe: true } : m),
      }));
      setShowMessageOptions(null);
    },
  });

  const deleteMessageForEveryoneMutation = useMutation({
    mutationFn: ({ conversationId, messageId }) => messagesAPI.deleteForEveryone(conversationId, messageId),
    onSuccess: (_, { conversationId, messageId }) => {
      queryClient.setQueryData(['messages', conversationId], old => ({
        ...old,
        data: old.data.map(m => m._id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted', attachments: [] } : m),
      }));
      setShowMessageOptions(null);
    },
    onError: (error) => {
      if (error.response?.status === 403) {
        alert('You can only delete your own messages within 1 hour');
      }
    },
  });

  // ========== EFFECTS ==========
  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token && user) {
      try {
        getSocket(token);
      } catch (error) {
        console.error('Failed to initialize socket:', error);
      }
    }
  }, [user]);

  // Handle conversation selection based on URL
  useEffect(() => {
    const all = getAllConversations();

    if (conversationId) {
      const conv = all.find(c => c._id === conversationId);
      if (conv) {
        // Only update if conversation actually changed
        if (lastSelectedConvRef.current !== conversationId) {
          lastSelectedConvRef.current = conversationId;
          setSelectedConversation(conv);
        }

        // Only mark as read if there are unread messages and not already marked
        if (conv.unreadCount > 0 && lastMarkedReadRef.current !== conversationId) {
          lastMarkedReadRef.current = conversationId;
          markAsReadMutation.mutate(conversationId);
        }
      } else if (lastSelectedConvRef.current !== null) {
        lastSelectedConvRef.current = null;
        setSelectedConversation(null);
      }
    } else if (lastSelectedConvRef.current !== null) {
      lastSelectedConvRef.current = null;
      setSelectedConversation(null);
    }
  }, [conversationId, getAllConversations, markAsReadMutation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesData?.data?.length) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messagesData?.data]);

  // Real-time message handler with push notifications
  useEffect(() => {
    const cleanup = messagesRealTime.onNewMessage((message) => {
      // Update messages if in current conversation
      if (message.conversation === selectedConversation?._id) {
        queryClient.setQueryData(['messages', selectedConversation._id], (old) => ({
          data: [...(old?.data || []), message],
        }));
      }

      // Send push notification if not from current user
      if (message.sender?._id !== user?.id) {
        const conversation = getAllConversations().find(c => c._id === message.conversation);
        if (conversation?.otherParticipant?._id) {
          sendPushNotification(conversation.otherParticipant._id, {
            title: `💬 New message from ${message.sender?.name || message.sender?.username}`,
            body: message.contentType !== 'text'
              ? `Sent a ${message.contentType}`
              : (message.content?.substring(0, 100) + (message.content?.length > 100 ? '...' : '')),
            type: 'message',
            icon: '/icons/message-icon.png',
            badge: '/badge-message.png',
            data: {
              url: `/messages/${message.conversation}`,
              conversationId: message.conversation,
              senderId: message.sender?._id,
              senderName: message.sender?.name,
              senderUsername: message.sender?.username,
            }
          }).catch(console.error);
        }
      }

      // Invalidate queries to update UI
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    });

    return cleanup;
  }, [selectedConversation?._id, user?.id, sendPushNotification, queryClient, getAllConversations]);

  // Typing indicator
  useEffect(() => {
    const cleanup = messagesRealTime.onTyping(({ userId, conversationId, isTyping }) => {
      if (conversationId === selectedConversation?._id && userId !== user?.id) {
        const el = document.getElementById('typing-indicator');
        if (el) {
          el.style.display = isTyping ? 'flex' : 'none';
        }
      }
    });
    return cleanup;
  }, [selectedConversation?._id, user?.id]);

  // ========== HANDLERS ==========
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation?._id || isArchived) return;
    sendMessageMutation.mutate({
      conversationId: selectedConversation._id,
      content: messageInput
    });
  };

  const handleTyping = () => {
    if (!selectedConversation?._id || isArchived) return;
    if (typingTimeout) clearTimeout(typingTimeout);
    messagesRealTime.startTyping(selectedConversation._id);
    setTypingTimeout(setTimeout(() => messagesRealTime.stopTyping(selectedConversation._id), 2000));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleFileUpload = () => {
    if (isArchived) {
      alert('Cannot send files in archived conversation');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedConversation?._id || isArchived) return;

    const formData = new FormData();
    formData.append('attachments', file);

    try {
      await messagesAPI.send(selectedConversation._id, formData);
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation._id] });

      // Send push notification for file
      if (selectedConversation?.otherParticipant) {
        const fileType = file.type.startsWith('image/') ? 'image' : 'file';
        sendPushNotification(selectedConversation.otherParticipant._id, {
          title: `📎 New ${fileType} from ${user?.name || user?.username}`,
          body: `Sent a ${fileType}: ${file.name}`,
          type: 'message',
          icon: '/icons/message-icon.png',
          badge: '/badge-message.png',
          data: {
            url: `/messages/${selectedConversation._id}`,
            conversationId: selectedConversation._id,
            senderId: user?.id,
            senderName: user?.name,
            senderUsername: user?.username,
            fileName: file.name,
            fileType: fileType,
          }
        }).catch(console.error);
      }
    } catch (error) {
      if (error.response?.status === 403) {
        alert('Cannot send file. You are no longer mutual followers.');
        setIsArchived(true);
      }
    }
    e.target.value = '';
  };

  const handleSelectConversation = (conversation) => {
    lastSelectedConvRef.current = conversation._id;
    setSelectedConversation(conversation);
    navigate(`/messages/${conversation._id}`);

    if (conversation.unreadCount > 0) {
      lastMarkedReadRef.current = conversation._id;
      markAsReadMutation.mutate(conversation._id);
    }
  };

  const handleArchiveToggle = () => {
    if (isArchived) unarchiveMutation.mutate(selectedConversation._id);
    else archiveMutation.mutate(selectedConversation._id);
  };

  const handlePinToggle = () => {
    if (selectedConversation?.isPinned) unpinMutation.mutate(selectedConversation._id);
    else pinMutation.mutate(selectedConversation._id);
  };

  const handleDeleteConversation = () => {
    if (window.confirm('Delete this conversation permanently? This cannot be undone.')) {
      deleteConversationMutation.mutate(selectedConversation._id);
    }
  };

  const handleMessageOptions = (message, e) => {
    e.stopPropagation();
    setSelectedMessage(message);
    setShowMessageOptions(message._id);
  };

  const handleDeleteMessageForMe = () => {
    if (window.confirm('Delete this message for you?')) {
      deleteMessageForMeMutation.mutate({
        conversationId: selectedConversation._id,
        messageId: selectedMessage._id,
      });
    }
  };

  const handleDeleteMessageForEveryone = () => {
    if (window.confirm('Delete this message for everyone?')) {
      deleteMessageForEveryoneMutation.mutate({
        conversationId: selectedConversation._id,
        messageId: selectedMessage._id,
      });
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
    const timeout = setTimeout(() => {
      if (value.length >= 2) searchUsers();
    }, 500);
    setSearchDebounceTimeout(timeout);
  };

  const handleSelectUser = (userId) => {
    createConversationMutation.mutate(userId);
  };

  // ========== RENDER DATA ==========
  const isLoading = activeLoading || archivedLoading || pinnedLoading;
  const filteredConversations = getFilteredConversations();
  const mutualWithoutConv = getMutualFollowersWithoutConversation();
  const messages = messagesData?.data || [];
  const unreadTotal = unreadCountData?.total || 0;

  if (isLoading && filteredConversations.length === 0) {
    return (
      <div className={`messages-container ${isDark ? 'dark' : ''}`}>
        <div className="messages-loading">
          <div className="loading-spinner"></div>
          <p>Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`messages-container ${selectedConversation ? 'chat-open' : ''} ${isDark ? 'dark' : ''}`}>
      {/* Theme Toggle */}
      <button className="theme-toggle-messages" onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'}>
        <i className={`fas fa-${isDark ? 'sun' : 'moon'}`}></i>
      </button>

      {/* ==================== SIDEBAR ==================== */}
      <div className="conversations-sidebar">
        <div className="sidebar-header">
          <h2>Messages</h2>
          <div className="header-actions">
            {unreadTotal > 0 && (
              <span className="unread-badge">{unreadTotal}</span>
            )}
            <button
              className="new-message-button"
              onClick={() => setShowNewMessageModal(true)}
              aria-label="New message"
              title="New message"
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 5L19 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="sidebar-search">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            type="text"
            placeholder="Search conversations..."
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
          />
          {sidebarSearch && (
            <button className="clear-search" onClick={() => setSidebarSearch('')} aria-label="Clear search">
              ×
            </button>
          )}
        </div>

        <div className="chat-filters">
          <button
            className={`filter-btn ${chatFilter === 'all' ? 'active' : ''}`}
            onClick={() => setChatFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${chatFilter === 'active' ? 'active' : ''}`}
            onClick={() => setChatFilter('active')}
          >
            Active
          </button>
          <button
            className={`filter-btn ${chatFilter === 'pinned' ? 'active' : ''}`}
            onClick={() => setChatFilter('pinned')}
          >
            Pinned
          </button>
          <button
            className={`filter-btn ${chatFilter === 'archived' ? 'active' : ''}`}
            onClick={() => setChatFilter('archived')}
          >
            Archived
          </button>
        </div>

        <div className="conversations-list">
          {filteredConversations.length === 0 && mutualWithoutConv.length === 0 ? (
            <div className="no-conversations">
              <div className="empty-state-icon">💬</div>
              <p>No conversations</p>
              <p className="hint">Start a new message with the + button</p>
            </div>
          ) : (
            <>
              {filteredConversations.map((conv) => (
                <ConversationItem
                  key={conv._id}
                  conversation={conv}
                  isSelected={selectedConversation?._id === conv._id}
                  onClick={() => handleSelectConversation(conv)}
                />
              ))}

              {chatFilter === 'all' && mutualWithoutConv.length > 0 && (
                <>
                  <div className="sidebar-section-divider">
                    <span>Mutual Followers</span>
                  </div>
                  {mutualWithoutConv.map((follower) => (
                    <MutualFollowerItem
                      key={follower._id}
                      follower={follower}
                      onClick={() => handleSelectUser(follower._id)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ==================== CHAT AREA ==================== */}
      <div className="messages-area">
        {selectedConversation ? (
          <>
            <div className="conversation-header">
              <button
                className="mobile-back-button"
                onClick={() => navigate('/messages')}
                aria-label="Back to conversations"
              >
                ←
              </button>

              <div className="header-info">
                <div className="avatar-large">
                  {selectedConversation.otherParticipant?.name?.[0]?.toUpperCase()}
                </div>
                <div className="header-text">
                  <div className="name-container">
                    <h3>{selectedConversation.otherParticipant?.name || 'User'}</h3>
                    {selectedConversation.otherParticipant?.isOnline && (
                      <span className="online-dot"></span>
                    )}
                  </div>
                  <p className="header-username">@{selectedConversation.otherParticipant?.username}</p>
                </div>
              </div>

              <div className="header-actions">
                <button
                  className={`icon-button ${selectedConversation.isPinned ? 'active' : ''}`}
                  onClick={handlePinToggle}
                  title={selectedConversation.isPinned ? 'Unpin' : 'Pin'}
                >
                  📌
                </button>
                <button
                  className="icon-button"
                  onClick={handleArchiveToggle}
                  title={isArchived ? 'Unarchive' : 'Archive'}
                >
                  {isArchived ? '📤' : '📦'}
                </button>
                <button
                  className="icon-button delete"
                  onClick={handleDeleteConversation}
                  title="Delete conversation"
                >
                  🗑️
                </button>
              </div>

              {isArchived && (
                <div className="archived-banner">
                  <span>📦 This conversation is archived</span>
                </div>
              )}
            </div>

            <div className="messages-list">
              {messagesLoading ? (
                <div className="messages-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="no-messages">
                  <div className="empty-state-icon">💭</div>
                  <p>No messages yet</p>
                  <p className="hint">Send a message to start the conversation</p>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <div key={message._id} className={`message-wrapper ${message.sender?._id === user?.id ? 'own' : ''}`}>
                      <MessageBubble
                        message={message}
                        isOwnMessage={message.sender?._id === user?.id}
                        showAvatar={index === 0 || messages[index - 1]?.sender?._id !== message.sender?._id}
                      />

                      {!message.isDeleted && message.sender?._id === user?.id && (
                        <div className="message-options-container">
                          <button
                            className="message-options-btn"
                            onClick={(e) => handleMessageOptions(message, e)}
                            aria-label="Message options"
                          >
                            ⋮
                          </button>

                          {showMessageOptions === message._id && (
                            <div className="message-options-menu" ref={optionsRef}>
                              <button onClick={handleDeleteMessageForMe}>
                                <span>🗑️</span> Delete for me
                              </button>
                              <button onClick={handleDeleteMessageForEveryone}>
                                <span>⚠️</span> Delete for everyone
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  <div id="typing-indicator" className="typing-indicator" style={{ display: 'none' }}>
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span className="typing-text">typing...</span>
                  </div>

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {!isArchived ? (
              <form className="message-input-form" onSubmit={handleSendMessage}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />



                <div className="input-wrapper">
                  <textarea
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={handleKeyPress}
                    placeholder="Type a message..."
                    rows="1"
                  />
                </div>

                <button
                  type="submit"
                  className="send-button"
                  disabled={!messageInput.trim()}
                  title="Send message"
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </form>
            ) : (
              <div className="archived-message-notice">
                <p>This conversation is archived</p>
                <button onClick={handleArchiveToggle} className="unarchive-btn">
                  Unarchive to send messages
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="no-conversation-selected">
            <div className="empty-state">
              <div className="empty-state-icon-large">💬</div>
              <h3>Select a conversation</h3>
              <p>Choose a chat from the sidebar or start a new one</p>
              <button
                onClick={() => setShowNewMessageModal(true)}
                className="btn-primary"
              >
                New Message
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================== NEW MESSAGE MODAL ==================== */}
      {showNewMessageModal && (
        <div className="modal-overlay" onClick={() => setShowNewMessageModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Message</h3>
              <button className="close-button" onClick={() => setShowNewMessageModal(false)} aria-label="Close modal">
                ×
              </button>
            </div>

            <div className="modal-search">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input
                type="text"
                placeholder="Search mutual followers..."
                value={searchQuery}
                onChange={handleSearchChange}
                autoFocus
              />
            </div>

            <div className="modal-user-list">
              {searchLoading && (
                <div className="loading-container">
                  <div className="loading-spinner-small"></div>
                  <p>Searching...</p>
                </div>
              )}

              {(searchQuery.length >= 2 ? searchResultsData?.data || [] : mutualWithoutConv).map((u) => (
                <UserListItem
                  key={u._id}
                  user={u}
                  onClick={() => handleSelectUser(u._id)}
                  isLoading={createConversationMutation.isLoading}
                />
              ))}

              {searchQuery.length >= 2 && (searchResultsData?.data || []).length === 0 && !searchLoading && (
                <div className="no-results">
                  <div className="empty-state-icon">🔍</div>
                  <p>No mutual followers found</p>
                  <p className="hint">Try a different search term</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== SUB-COMPONENTS ====================

const ConversationItem = ({ conversation, isSelected, onClick }) => {
  const p = conversation.otherParticipant;
  const last = conversation.lastMessage;

  const preview = !last ? 'No messages yet' :
    last.isDeleted ? 'This message was deleted' :
      last.contentType !== 'text' ? `📎 ${last.contentType}` :
        last.content?.length > 30 ? last.content.substring(0, 30) + '...' : last.content;

  const time = last?.createdAt ? formatDistanceToNow(new Date(last.createdAt), { addSuffix: true }) : '';

  return (
    <div
      className={`conversation-item ${isSelected ? 'selected' : ''} ${conversation.unreadCount > 0 ? 'unread' : ''} ${conversation.isPinned ? 'pinned' : ''}`}
      onClick={onClick}
    >
      <div className="conversation-avatar">
        <div className="avatar">
          {p?.name?.[0]?.toUpperCase()}
        </div>
        {p?.isOnline && <span className="online-indicator"></span>}
      </div>

      <div className="conversation-info">
        <div className="conversation-header">
          <div className="name-container">
            <h4>{p?.name}</h4>
            {conversation.isPinned && <span className="pinned-icon">📌</span>}
          </div>
          <span className="time">{time}</span>
        </div>

        <div className="conversation-preview">
          <p className={`preview-text ${last?.contentType !== 'text' ? 'file-preview' : ''}`}>
            {preview}
          </p>
          {conversation.unreadCount > 0 && (
            <span className="unread-count">{conversation.unreadCount}</span>
          )}
        </div>
      </div>
    </div>
  );
};

const MutualFollowerItem = ({ follower, onClick }) => (
  <div className="mutual-follower-item" onClick={onClick}>
    <div className="conversation-avatar">
      <div className="avatar">{follower.name?.[0]?.toUpperCase()}</div>
      {follower.isOnline && <span className="online-indicator"></span>}
    </div>

    <div className="conversation-info">
      <div className="name-container">
        <h4>{follower.name}</h4>
        <p className="username">@{follower.username}</p>
      </div>
      <p className="mutual-badge">Mutual follower</p>
    </div>

    <button className="message-icon-btn" aria-label="Start conversation">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  </div>
);

const MessageBubble = ({ message, isOwnMessage, showAvatar }) => {
  const time = message.createdAt ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true }) : '';

  const renderContent = () => {
    if (message.isDeleted || message.isDeletedForMe) {
      return (
        <em className="deleted-message">
          {message.isDeletedForMe ? 'You deleted this message' : 'This message was deleted'}
        </em>
      );
    }

    if (message.contentType === 'image' && message.attachments?.[0]?.url) {
      return (
        <div className="message-image-container">
          <img
            src={message.attachments[0].url}
            alt="Shared"
            className="message-image"
            loading="lazy"
          />
        </div>
      );
    }

    if (message.contentType === 'file' && message.attachments?.[0]?.url) {
      return (
        <div className="message-file">
          <div className="file-icon">📎</div>
          <a
            href={message.attachments[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="file-link"
          >
            {message.attachments[0].fileName || 'Download file'}
          </a>
        </div>
      );
    }

    return <p className="message-text">{message.content}</p>;
  };

  return (
    <div className={`message-bubble ${isOwnMessage ? 'own' : 'other'}`}>
      {!isOwnMessage && showAvatar && (
        <div className="message-avatar">
          {message.sender?.name?.[0]?.toUpperCase()}
        </div>
      )}

      <div className="message-content-wrapper">
        {!isOwnMessage && message.sender && (
          <div className="message-sender">
            <span className="sender-name">{message.sender.name}</span>
            <span className="sender-username">@{message.sender.username}</span>
          </div>
        )}

        <div className="message-content">
          {renderContent()}

          <div className="message-meta">
            <span className="time">{time}</span>
            {isOwnMessage && !message.isDeleted && (
              <span className="status" title={message.readBy?.length > 1 ? 'Read' : 'Sent'}>
                {message.readBy?.length > 1 ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const UserListItem = ({ user, onClick, isLoading }) => (
  <div className="user-list-item" onClick={onClick}>
    <div className="user-avatar">
      {user.name?.[0]?.toUpperCase()}
    </div>

    <div className="user-info">
      <h4>{user.name}</h4>
      <p>@{user.username}</p>
    </div>

    {isLoading ? (
      <div className="loading-spinner-small"></div>
    ) : (
      <button className="message-button" aria-label="Message">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    )}
  </div>
);

export default MessagePage;