import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, SafeAreaView } from 'react-native';

const HomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Image 
            source={{ uri: 'https://solana.com/src/img/branding/solanaLogoMark.svg' }} 
            style={styles.logo} 
            resizeMode="contain"
          />
          <Text style={styles.title}>Solana Blink API Generator</Text>
        </View>
        
        <View style={styles.infoSection}>
          <Text style={styles.subtitle}>What is a Blink API?</Text>
          <Text style={styles.text}>
            Blink APIs allow you to create custom Solana actions for your Telegram channel. Users will be able to support 
            your channel through Solana payments directly from their wallets.
          </Text>
          
          <Text style={styles.subtitle}>How it works:</Text>
          <View style={styles.stepContainer}>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>Create your Blink API by filling out the form</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>Share the generated API link with your audience</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>Receive Solana payments directly to your wallet</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('Form')}
        >
          <Text style={styles.buttonText}>Create Your Blink API</Text>
        </TouchableOpacity>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  infoSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#14f195',
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    color: '#ddd',
    lineHeight: 24,
    marginBottom: 20,
  },
  stepContainer: {
    marginTop: 10,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  stepNumber: {
    backgroundColor: '#14f195',
    color: '#0e0e2c',
    width: 30,
    height: 30,
    borderRadius: 15,
    textAlign: 'center',
    lineHeight: 30,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 15,
  },
  stepText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  button: {
    backgroundColor: '#14f195',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0e0e2c',
  },
});

export default HomeScreen; 