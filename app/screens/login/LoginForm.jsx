import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Text, StyleSheet, TextInput, View, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { userData } from '../../database/userData';

export default function LoginForm() {
    const navigate = useNavigation();
    const [showPassword, setShowPassword] = useState(false);

    const toggleShowPassword = () => {
        setShowPassword(!showPassword);
    };

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = () => {
        const user = userData.find(user => user.username === username && user.password === password);
        if (user) {
            navigate.push('Menu');
            setPassword('');
            setUsername('');
        } else {
            Alert.alert('Invalid Credentials', 'Please enter valid username and password.');
        }
        setPassword('');
        setUsername('');
    };

    return (
        <View style={styles.form}>
            <View style={styles.inputContainer}>
                {/* <MaterialCommunityIcons name="account" size={24} color="black" style={styles.icon} /> */}
                <TextInput style={styles.textField}
                    value={username}
                    onChangeText={setUsername} placeholder='Enter username' required />
            </View>
            <View style={styles.inputContainer}>
                {/* <MaterialCommunityIcons name="lock" size={24} color="black" style={styles.icon} /> */}
                <TextInput
                    style={styles.textField}
                    placeholder='Enter password'
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={toggleShowPassword} style={styles.eyeIcon}>
                    <MaterialCommunityIcons
                        name={showPassword ? "eye-off" : "eye"}
                        size={24}
                        color="black"
                    />
                </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.button} onPress={handleLogin} >
                <View>
                    <Text style={styles.buttonText}>LOG IN</Text>
                </View>
            </TouchableOpacity>
            <View>
                <Text style={styles.text}>Or</Text>
            </View>
            <TouchableOpacity style={[styles.button, styles.google_btn]} onPress={() => {/* Handle Google sign-in */ }}>
                <View>
                    <Text style={styles.buttonText}>SIGN IN WITH GOOGLE</Text>
                </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigate.push('SignUp')}>
                <Text style={styles.text}>Don't have an account?
                    <Text style={styles.link}>Sign Up</Text>
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    form: {
        flex: 1.5,
        justifyContent: 'center',
        justifyItems: 'center',
        paddingLeft: "5%",
        paddingRight: "5%",
        gap: 12,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    // icon: {
    //     marginLeft: 10,
    // },
    textField: {
        flex: 1,
        borderWidth: 0.2,
        borderRadius: 5,
        borderColor: 'gray',
        fontSize: 16,
        padding: 7,
        paddingLeft: 20,
        backgroundColor: '#e4eaeb'
    },
    eyeIcon: {
        position: 'absolute',
        right: 6,
        top: '50%',
        paddingHorizontal: 5,
        transform: [{ translateY: -10 }],
        backgroundColor: '#e4eaeb'
    },
    button: {
        borderRadius: 5,
        padding: 7,
        borderWidth: 0.2,
        borderRadius: 5,
        backgroundColor: '#2888eb',
    },
    google_btn: {
        backgroundColor: 'darkgray',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
    },
    text: {
        color: 'black',
        textAlign: 'center'
    },
    link: {
        color: 'blue',
        paddingTop: 5,
    }

});
