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
    errorDiv.className = 'error-popup';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(errorDiv);
    
    // Remove the error message after 3 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
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
    const user = auth.currentUser;
    if (!user) {
        console.log('No authenticated user');
        window.location.href = 'index.html';
        return;
    }

    // Always fetch fresh data from Firestore from the users collection
    console.log('Fetching fresh data from Firestore for user:', user.uid);
    db.collection('users').doc(user.uid)  // Changed from 'students' to 'users'
        .get()
        .then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                console.log('Fresh Firestore data:', userData);
                sessionStorage.setItem('userData', JSON.stringify(userData));
                updatePageContent(userData);
            } else {
                console.log('No document found, creating new one');
                const newUserData = createNewUserData(user.email);
                return db.collection('users').doc(user.uid)  // Changed from 'students' to 'users'
                    .set(newUserData)
                    .then(() => {
                        sessionStorage.setItem('userData', JSON.stringify(newUserData));
                        updatePageContent(newUserData);
                    });
            }
        })
        .catch(error => {
            console.error('Error fetching user data:', error);
            showError('Unable to load user data. Please try again later.');
        });
}

// Function to update page content with user data
function updatePageContent(userData) {
    const currentPage = window.location.pathname.split('/').pop();
    console.log('Updating content for:', currentPage, 'with data:', userData);

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
        console.log('Updating profile elements');
        
        const elements = {
            studentName: document.getElementById('studentName'),
            grade: document.getElementById('grade'),
            studentEmail: document.getElementById('studentEmail'),
            studentPhone: document.getElementById('studentPhone'),
            studentGrade: document.getElementById('studentGrade'),
            parentCode: document.getElementById('parentCode'),
            qrCode: document.getElementById('qrCode')
        };

        // Update profile elements with values directly from Firestore
        if (elements.studentName) {
            elements.studentName.textContent = userData.name || 'Click to set name';
            elements.studentName.classList.toggle('not-set', !userData.name);
        }
        if (elements.grade) {
            elements.grade.textContent = userData.grade || 'Click to set grade';
            elements.grade.classList.toggle('not-set', !userData.grade);
        }
        if (elements.studentEmail) {
            elements.studentEmail.textContent = userData.email;
        }
        if (elements.studentPhone) {
            elements.studentPhone.textContent = userData.phoneNumber || 'Click to add phone number';
            elements.studentPhone.classList.toggle('not-set', !userData.phoneNumber);
        }
        if (elements.studentGrade) {
            elements.studentGrade.textContent = userData.grade || 'Click to set grade';
            elements.studentGrade.classList.toggle('not-set', !userData.grade);
        }
        if (elements.parentCode) {
            elements.parentCode.textContent = userData.parentCode || 'Not Set';
        }
        
        // Generate QR code if container exists
        if (elements.qrCode && userData.parentCode) {
            elements.qrCode.innerHTML = '';
            new QRCode(elements.qrCode, {
                text: userData.parentCode,
                width: 128,
                height: 128
            });
        }

        // Setup logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
    }
}

// Function to create new user data
function createNewUserData(email) {
    return {
        email: email,
        name: email.split('@')[0],
        createdAt: new Date(),
        lastLogin: new Date(),
        grade: '',
        phoneNumber: '',
        parentPhoneNumber: '',
        parentCode: 'PAR' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        role: 'student'
    };
}

// Update handleLogin function to use users collection
function handleLogin(event) {
    console.log('Login attempt...'); // Debug log
    event.preventDefault();
    const email = event.target.email.value;
    const password = event.target.password.value;
    
    console.log('Attempting login with:', email); // Debug log

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('Authentication successful, UID:', userCredential.user.uid);
            
            // First, try to get the user document from users collection
            db.collection('users').doc(userCredential.user.uid)  // Changed from 'students' to 'users'
                .get()
                .then((doc) => {
                    if (doc.exists) {
                        console.log('User data found:', doc.data());
                        sessionStorage.setItem('userData', JSON.stringify(doc.data()));
                        window.location.href = 'home.html';
                    } else {
                        console.log('No existing document, creating new one...'); // Debug log
                        // Create a new document for the user
                        const userData = createNewUserData(email);
                        
                        return db.collection('users').doc(userCredential.user.uid)  // Changed from 'students' to 'users'
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

// Update auth state change listener
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('User is signed in:', user.email);
        const currentPage = window.location.pathname.split('/').pop();
        
        if (currentPage === 'index.html') {
            window.location.href = 'home.html';
            return;
        }

        // Always fetch fresh data when auth state changes
        updatePage();
    } else {
        console.log('User is signed out');
        sessionStorage.removeItem('userData');
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage !== 'index.html') {
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

