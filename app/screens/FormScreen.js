import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView
} from 'react-native';

const FormScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    channelName: '',
    description: '',
    fee: '',
    publicKey: '',
    coverImage: '',
    link: '',
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    let newErrors = {};
    let isValid = true;

    if (!formData.channelName.trim() || !/^[a-zA-Z0-9-_\s]{3,50}$/.test(formData.channelName)) {
      newErrors.channelName = 'Channel name must be 3-50 characters and can only contain letters, numbers, spaces, hyphens, and underscores';
      isValid = false;
    }

    if (!formData.description.trim() || formData.description.trim().length < 10 || formData.description.length > 1000) {
      newErrors.description = 'Description must be between 10 and 1000 characters';
      isValid = false;
    }

    const feeValue = parseFloat(formData.fee);
    if (isNaN(feeValue) || feeValue <= 0 || feeValue > 1000) {
      newErrors.fee = 'Fee must be between 0 and 1000 SOL';
      isValid = false;
    }

    if (!formData.publicKey.trim()) {
      newErrors.publicKey = 'Solana public key is required';
      isValid = false;
    }

    if (formData.coverImage && !/^https?:\/\/.+/.test(formData.coverImage)) {
      newErrors.coverImage = 'Cover image must be a valid URL starting with http:// or https://';
      isValid = false;
    }

    if (!formData.link.trim() || !/(t\.me|telegram\.me)/.test(formData.link)) {
      newErrors.link = 'Must be a valid Telegram link (t.me or telegram.me)';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
    });
    // Clear error when user types
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null,
      });
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Assuming your server is running on localhost:3000 - in a real app, use the appropriate backend URL
      const response = await fetch('http://localhost:3000/api/blink/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'An error occurred');
      }

      navigation.navigate('Success', { 
        channelName: data.channelName,
        route: data.route 
      });
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create Blink API');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Create Your Blink API</Text>
          <Text style={styles.subtitle}>
            Fill out the form below to generate a custom Solana Blink API for your Telegram channel
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Channel Name</Text>
            <TextInput
              style={[styles.input, errors.channelName && styles.inputError]}
              placeholder="Enter your channel name"
              placeholderTextColor="#9DA3B4"
              value={formData.channelName}
              onChangeText={(text) => handleChange('channelName', text)}
            />
            {errors.channelName && <Text style={styles.errorText}>{errors.channelName}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.description && styles.inputError]}
              placeholder="Describe your channel and what users are supporting"
              placeholderTextColor="#9DA3B4"
              multiline
              numberOfLines={4}
              value={formData.description}
              onChangeText={(text) => handleChange('description', text)}
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Fee (in SOL)</Text>
            <TextInput
              style={[styles.input, errors.fee && styles.inputError]}
              placeholder="Amount in SOL (e.g., 0.5)"
              placeholderTextColor="#9DA3B4"
              keyboardType="numeric"
              value={formData.fee}
              onChangeText={(text) => handleChange('fee', text)}
            />
            {errors.fee && <Text style={styles.errorText}>{errors.fee}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Solana Public Key</Text>
            <TextInput
              style={[styles.input, errors.publicKey && styles.inputError]}
              placeholder="Your Solana wallet address"
              placeholderTextColor="#9DA3B4"
              value={formData.publicKey}
              onChangeText={(text) => handleChange('publicKey', text)}
            />
            {errors.publicKey && <Text style={styles.errorText}>{errors.publicKey}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Cover Image URL (optional)</Text>
            <TextInput
              style={[styles.input, errors.coverImage && styles.inputError]}
              placeholder="https://example.com/your-image.png"
              placeholderTextColor="#9DA3B4"
              value={formData.coverImage}
              onChangeText={(text) => handleChange('coverImage', text)}
            />
            {errors.coverImage && <Text style={styles.errorText}>{errors.coverImage}</Text>}
            <Text style={styles.helperText}>Leave blank to use default image</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Telegram Channel Link</Text>
            <TextInput
              style={[styles.input, errors.link && styles.inputError]}
              placeholder="https://t.me/your_channel"
              placeholderTextColor="#9DA3B4"
              value={formData.link}
              onChangeText={(text) => handleChange('link', text)}
            />
            {errors.link && <Text style={styles.errorText}>{errors.link}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Generate Blink API</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e0e2c',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#9DA3B4',
    marginBottom: 30,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#ff5a5a',
  },
  errorText: {
    color: '#ff5a5a',
    fontSize: 14,
    marginTop: 5,
  },
  helperText: {
    color: '#9DA3B4',
    fontSize: 14,
    marginTop: 5,
  },
  button: {
    backgroundColor: '#14f195',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(20, 241, 149, 0.5)',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0e0e2c',
  },
});

export default FormScreen; 