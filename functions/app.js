// Use Firebase compat version
const firebaseConfig = {
    apiKey: "AIzaSyC3Vbdt_Mji0yFlBWagM193154jy8w92BE",
    authDomain: "mr-abo-elmagd.firebaseapp.com",
    databaseURL: "https://mr-abo-elmagd-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "mr-abo-elmagd",
    storageBucket: "mr-abo-elmagd.firebasestorage.app",
    messagingSenderId: "800500545555",
    appId: "1:800500545555:web:f9d05c31d9f36ac9a9e7e6",
    measurementId: "G-54XPBRFHZZ"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Function to show error messages
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

// Function to handle logout
function handleLogout() {
    auth.signOut().then(() => {
        sessionStorage.removeItem('userData');
        window.location.href = 'index.html';
    });
}

// Function to update pages with user data
function updatePage() {
    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    const currentPage = window.location.pathname.split('/').pop();
    console.log('Updating page:', currentPage);
    console.log('User data:', userData);

    // Check if user is authenticated
    const user = auth.currentUser;
    if (!user) {
        console.log('No authenticated user');
        window.location.href = 'index.html';
        return;
    }

    // If no userData, try to fetch it
    if (Object.keys(userData).length === 0) {
        console.log('No user data, fetching from Firestore');
        db.collection('students').doc(user.uid)
            .get()
            .then((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    sessionStorage.setItem('userData', JSON.stringify(data));
                    updatePageContent(data);
                } else {
                    // Create new user document
                    const newUserData = {
                        email: user.email,
                        createdAt: new Date().toISOString(),
                        grade: 'Not Set',
                        phone: 'Not Set',
                        parentCode: 'PAR' + Math.random().toString(36).substr(2, 6).toUpperCase()
                    };
                    return db.collection('students').doc(user.uid)
                        .set(newUserData)
                        .then(() => {
                            sessionStorage.setItem('userData', JSON.stringify(newUserData));
                            updatePageContent(newUserData);
                        });
                }
            })
            .catch(error => {
                console.error('Error fetching user data:', error);
                showError('Error loading user data');
            });
    } else {
        updatePageContent(userData);
    }
}

// Function to update page content with user data
function updatePageContent(userData) {
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage === 'home.html') {
        const attendanceQR = document.getElementById('attendanceQR');
        if (attendanceQR && userData.email) {
            console.log('Generating QR code for:', userData.email);
            attendanceQR.innerHTML = '';
            new QRCode(attendanceQR, {
                text: userData.email,
                width: 128,
                height: 128
            });
        }
    } else if (currentPage === 'profile.html') {
        const elements = {
            studentName: document.getElementById('studentName'),
            grade: document.getElementById('grade'),
            studentEmail: document.getElementById('studentEmail'),
            studentPhone: document.getElementById('studentPhone'),
            studentGrade: document.getElementById('studentGrade'),
            parentCode: document.getElementById('parentCode'),
            qrCode: document.getElementById('qrCode')
        };

        // Update profile elements
        if (elements.studentName) elements.studentName.textContent = userData.email || 'N/A';
        if (elements.studentEmail) elements.studentEmail.textContent = userData.email || 'N/A';
        if (elements.grade) elements.grade.textContent = userData.grade || 'N/A';
        if (elements.studentGrade) elements.studentGrade.textContent = userData.grade || 'N/A';
        if (elements.studentPhone) elements.studentPhone.textContent = userData.phone || 'N/A';
        if (elements.parentCode && userData.parentCode) {
            elements.parentCode.textContent = userData.parentCode;
            
            // Generate parent QR code
            if (elements.qrCode) {
                elements.qrCode.innerHTML = '';
                new QRCode(elements.qrCode, {
                    text: userData.parentCode,
                    width: 128,
                    height: 128
                });
            }
        }

        // Setup logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
    }
}

// Function to handle login
function handleLogin(event) {
    console.log('Login attempt...'); // Debug log
    event.preventDefault();
    const email = event.target.email.value;
    const password = event.target.password.value;
    
    console.log('Attempting login with:', email); // Debug log

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('Authentication successful, UID:', userCredential.user.uid); // Enhanced debug log
            
            // First, try to get the user document
            db.collection('students').doc(userCredential.user.uid)
                .get()
                .then((doc) => {
                    if (doc.exists) {
                        console.log('User data found:', doc.data()); // Debug log
                        sessionStorage.setItem('userData', JSON.stringify(doc.data()));
                        window.location.href = 'home.html';
                    } else {
                        console.log('No existing document, creating new one...'); // Debug log
                        // Create a new document for the user
                        const userData = {
                            email: email,
                            createdAt: new Date().toISOString(),
                            // Add any other default fields you need
                        };
                        
                        return db.collection('students').doc(userCredential.user.uid)
                            .set(userData)
                            .then(() => {
                                console.log('New user document created');
                                sessionStorage.setItem('userData', JSON.stringify(userData));
                                window.location.href = 'home.html';
                            })
                            .catch(error => {
                                console.error('Error creating user document:', error);
                                // If we can't create the document, still redirect
                                window.location.href = 'home.html';
                            });
                    }
                })
                .catch(error => {
                    console.error('Firestore error:', error, 'User UID:', userCredential.user.uid);
                    // If Firestore fails, still redirect to home
                    console.log('Redirecting to home despite error...');
                    window.location.href = 'home.html';
                });
        })
        .catch(error => {
            console.error('Authentication error:', error);
            showError('Invalid email or password');
        });
}

// Add auth state change listener
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('User is signed in:', user.email);
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        // If on index page and authenticated, redirect to home
        if (currentPage === 'index.html') {
            window.location.href = 'home.html';
            return; // Stop execution after redirect
        }

        // Check if we have user data in session storage
        const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
        if (Object.keys(userData).length === 0) {
            // If no data in session storage, fetch it
            db.collection('students').doc(user.uid)
                .get()
                .then((doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        sessionStorage.setItem('userData', JSON.stringify(data));
                        updatePage();
                    } else {
                        // Create new user document if it doesn't exist
                        const newUserData = {
                            email: user.email,
                            createdAt: new Date().toISOString(),
                            grade: 'Not Set',
                            phone: 'Not Set',
                            parentCode: 'PAR' + Math.random().toString(36).substr(2, 6).toUpperCase()
                        };
                        return db.collection('students').doc(user.uid)
                            .set(newUserData)
                            .then(() => {
                                sessionStorage.setItem('userData', JSON.stringify(newUserData));
                                updatePage();
                            });
                    }
                })
                .catch(error => {
                    console.error('Error fetching user data:', error);
                    showError('Error loading user data');
                });
        } else {
            updatePage();
        }
    } else {
        console.log('User is signed out');
        sessionStorage.removeItem('userData');
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        // Only redirect to index if not already there and not on public pages
        const publicPages = ['index.html'];
        if (!publicPages.includes(currentPage)) {
            window.location.href = 'index.html';
        }
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    console.log('Current page:', currentPage);
    
    if (currentPage === 'index.html') {
        // Only set up login form if user is not already authenticated
        if (!auth.currentUser) {
            const loginForm = document.getElementById('login-form');
            if (loginForm) {
                loginForm.addEventListener('submit', handleLogin);
            }
        }
    } else {
        // For other pages, check authentication and update page
        const user = auth.currentUser;
        if (user) {
            updatePage();
        }
    }
});

