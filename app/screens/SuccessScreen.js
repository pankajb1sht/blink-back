import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView,
  Linking, 
  Share,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SuccessScreen = ({ route, navigation }) => {
  const { channelName, route: apiRoute } = route.params;
  const [copied, setCopied] = useState(false);
  
  // Construct the full API URL - in a real app, use your actual server URL
  const apiUrl = `http://localhost:3000${apiRoute}`;

  const handleCopyToClipboard = () => {
    // In a complete app, you would use Clipboard.setString(apiUrl)
    // But for this code-only example, we'll just simulate it
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Alert.alert('Copied!', 'API URL copied to clipboard');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my Solana Blink API for ${channelName}: ${apiUrl}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share API URL');
    }
  };

  const handleCreateAnother = () => {
    navigation.navigate('Form');
  };

  const handleDone = () => {
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={100} color="#14F195" />
        </View>
        
        <Text style={styles.title}>Success!</Text>
        <Text style={styles.subtitle}>
          Your Blink API for <Text style={styles.highlight}>{channelName}</Text> has been created successfully.
        </Text>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your API URL</Text>
          <View style={styles.urlContainer}>
            <Text style={styles.url} numberOfLines={2} ellipsizeMode="middle">
              {apiUrl}
            </Text>
            <TouchableOpacity 
              style={styles.copyButton} 
              onPress={handleCopyToClipboard}
            >
              <Ionicons 
                name={copied ? "checkmark" : "copy-outline"} 
                size={22} 
                color="#14F195" 
              />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Next Steps:</Text>
          <View style={styles.stepContainer}>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>
                Copy the API URL and share it with your audience
              </Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>
                Users can visit this URL to support your channel with Solana payments
              </Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>
                Payments will be sent directly to your Solana wallet
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.buttonGroup}>
          <TouchableOpacity 
            style={[styles.button, styles.shareButton]}
            onPress={handleShare}
          >
            <Ionicons name="share-social-outline" size={20} color="#fff" />
            <Text style={styles.shareButtonText}>Share URL</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.outlineButton]}
            onPress={handleCreateAnother}
          >
            <Text style={styles.outlineButtonText}>Create Another</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]}
            onPress={handleDone}
          >
            <Text style={styles.primaryButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e0e2c',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  successIcon: {
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9DA3B4',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 24,
  },
  highlight: {
    color: '#14F195',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 30,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9DA3B4',
    marginBottom: 10,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 10,
  },
  url: {
    flex: 1,
    color: '#14F195',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: 5,
  },
  infoSection: {
    width: '100%',
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  stepContainer: {
    marginTop: 5,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  stepNumber: {
    backgroundColor: '#14f195',
    color: '#0e0e2c',
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: 'center',
    lineHeight: 28,
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 15,
  },
  stepText: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
    lineHeight: 20,
  },
  buttonGroup: {
    width: '100%',
    marginTop: 10,
  },
  button: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  shareButton: {
    backgroundColor: '#5352ed',
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  primaryButton: {
    backgroundColor: '#14f195',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0e0e2c',
  },
});

export default SuccessScreen; 