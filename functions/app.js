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
    const errorPopup = document.createElement('div');
    errorPopup.className = 'error-popup';
    errorPopup.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(errorPopup);
    
    // Remove the error popup after 3 seconds
    setTimeout(() => {
        errorPopup.remove();
    }, 3000);
}

// Function to show success messages
function showSuccess(message) {
    const successPopup = document.createElement('div');
    successPopup.className = 'success-popup';
    successPopup.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(successPopup);
    
    // Remove the success popup after 3 seconds
    setTimeout(() => {
        successPopup.remove();
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
    const parentData = JSON.parse(sessionStorage.getItem('parentData'));
    
    // If it's a parent session
    if (parentData && parentData.role === 'parent') {
        const currentPage = window.location.pathname.split('/').pop();
        
        if (currentPage === 'parents.html') {
            // Load parent dashboard data
            loadParentDashboard(parentData);
        } else if (currentPage === 'index.html') {
            window.location.href = 'parents.html';
        }
        return;
    }

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

    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage === 'inbox.html') {
        loadMessages();
    }
}

// Function to update page content with user data
function updatePageContent(userData) {
    const currentPage = window.location.pathname.split('/').pop();
    console.log('Updating content for:', currentPage, 'with data:', userData);

    if (currentPage === 'home.html') {
        const attendanceQR = document.getElementById('attendanceQR');
        if (attendanceQR && userData.email) {
            // Create a unique, permanent attendance code for the user
            const attendanceCode = `ATT-${userData.email}-${userData.uid}`;
            console.log('Generating permanent QR code for attendance:', attendanceCode);
            
            // Clear existing QR code
            attendanceQR.innerHTML = '';
            
            // Generate new QR code with permanent attendance code
            new QRCode(attendanceQR, {
                text: attendanceCode,
                width: 128,
                height: 128
            });

            // Update the footer text to remove the "Updates every 30 seconds" message
            const qrFooter = document.querySelector('.qr-footer span');
            if (qrFooter) {
                qrFooter.textContent = 'Your Attendance QR Code';
            }
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
    const uid = auth.currentUser.uid;
    const parentCode = 'PAR' + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    // Create the parent code document
    createParentCodeDocument(uid, parentCode);
    
    return {
        email: email,
        name: email.split('@')[0],
        createdAt: new Date(),
        lastLogin: new Date(),
        grade: '',
        phoneNumber: '',
        parentPhoneNumber: '',
        parentCode: parentCode,
        attendanceCode: `ATT-${email}-${uid}`,
        role: 'student'
    };
}

// Function to create parent code document
async function createParentCodeDocument(studentId, parentCode) {
    try {
        await db.collection('parentCodes')
            .doc(parentCode)
            .set({
                studentId: studentId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
    } catch (error) {
        console.error('Error creating parent code document:', error);
    }
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

    // Add tab switching functionality
    const tabs = document.querySelectorAll('.tab');
    const forms = document.querySelectorAll('.auth-form');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Remove active class from all tabs and forms
            tabs.forEach(t => t.classList.remove('active'));
            forms.forEach(f => f.classList.remove('active'));

            // Add active class to clicked tab
            tab.classList.add('active');

            // Show corresponding form
            const formId = tab.dataset.tab + '-form';
            document.getElementById(formId)?.classList.add('active');
        });
    });

    // Handle signup link click
    const signupLink = document.querySelector('.signup-link');
    if (signupLink) {
        signupLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Remove active class from all tabs and forms
            tabs.forEach(t => t.classList.remove('active'));
            forms.forEach(f => f.classList.remove('active'));
            
            // Show signup form and activate signup tab
            document.getElementById('signup-form').classList.add('active');
            document.querySelector('[data-tab="signup"]')?.classList.add('active');
        });
    }

    // Add parent form submit handler
    const parentForm = document.getElementById('parent-form');
    if (parentForm) {
        console.log('Adding parent form submit handler');
        parentForm.addEventListener('submit', handleParentLogin);
        
        // Auto-capitalize parent code input
        const parentCodeInput = document.getElementById('parentCodeInput');
        if (parentCodeInput) {
            parentCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }
    }

    // Add this function for sending messages
    const messageForm = document.querySelector('.message-form');
    if (messageForm) {
        messageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const recipientType = document.getElementById('recipientType').value;
            const messageText = document.getElementById('messageText').value;
            
            if (!recipientType || !messageText) {
                showError('Please fill in all fields');
                return;
            }
            
            await sendMessage(recipientType, messageText);
            document.getElementById('messageText').value = '';
        });
    }
});

// Function to handle parent login
async function handleParentLogin(event) {
    event.preventDefault();
    console.log('Handling parent login...');
    const parentCode = document.getElementById('parentCodeInput').value.trim().toUpperCase();
    
    if (!parentCode) {
        showError('Please enter a parent code');
        return;
    }

    try {
        console.log('Querying Firestore with parent code:', parentCode);
        
        // Query for the student
        const querySnapshot = await db.collection('users')
            .where('parentCode', '==', parentCode)
            .get();

        if (querySnapshot.empty) {
            console.log('No matching parent code found');
            showError('Invalid parent code');
            return;
        }

        // Get the student document
        const studentDoc = querySnapshot.docs[0];
        const studentData = studentDoc.data();
        console.log('Found student data:', studentData);

        // Store parent session data
        const parentSession = {
            studentId: studentDoc.id,
            studentName: studentData.name,
            studentGrade: studentData.grade,
            parentCode: parentCode,
            role: 'parent',
            timestamp: new Date().toISOString()
        };

        console.log('Storing parent session:', parentSession);
        sessionStorage.setItem('parentData', JSON.stringify(parentSession));

        // Redirect to parent dashboard
        console.log('Redirecting to parent dashboard...');
        window.location.href = 'parents.html';

    } catch (error) {
        console.error('Parent login error:', error);
        showError('Error during login. Please try again.');
    }
}

// Add this function to check parent access
function checkParentAccess() {
    const parentData = JSON.parse(sessionStorage.getItem('parentData'));
    if (!parentData) {
        window.location.href = 'index.html';
        return null;
    }
    return parentData;
}

// Update the loadParentDashboard function
async function loadParentDashboard() {
    const parentData = checkParentAccess();
    if (!parentData) return;

    try {
        // Get student data
        const studentDoc = await db.collection('users').doc(parentData.studentId).get();
        if (studentDoc.exists) {
            const studentData = studentDoc.data();
            
            // Update dashboard elements
            document.getElementById('studentName').textContent = studentData.name;
            document.getElementById('studentGrade').textContent = studentData.grade;
            document.getElementById('studentEmail').textContent = studentData.email;
            document.getElementById('studentPhone').textContent = studentData.phoneNumber || 'Not set';
            
            // Get attendance records
            const attendanceQuery = await db.collection('attendance')
                .where('studentId', '==', parentData.studentId)
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();
            
            // Update attendance display
            const attendanceList = document.getElementById('attendanceList');
            if (attendanceList) {
                attendanceList.innerHTML = '';
                attendanceQuery.forEach(doc => {
                    const attendance = doc.data();
                    const li = document.createElement('li');
                    li.textContent = `${new Date(attendance.timestamp.toDate()).toLocaleString()}: ${attendance.status}`;
                    attendanceList.appendChild(li);
                });
            }
        }
    } catch (error) {
        console.error('Error loading parent dashboard:', error);
        showError('Error loading dashboard data');
    }
}

// Add these functions for message handling
async function loadMessages() {
    const user = auth.currentUser;
    const userData = JSON.parse(sessionStorage.getItem('userData'));
    
    if (!user || !userData) return;

    try {
        let messagesQuery;
        
        if (userData.role === 'student') {
            // Query for student messages
            messagesQuery = db.collection('messages').where('recipientId', '==', user.uid)
                .or('recipientType', '==', 'allStudents')
                .or('recipientType', '==', `senior${userData.grade}Students`);
        } else if (userData.role === 'assistant') {
            // Assistants can see all messages they've sent
            messagesQuery = db.collection('messages').where('senderId', '==', user.uid);
        }

        const snapshot = await messagesQuery.get();
        const messagesList = document.getElementById('messagesList');
        if (messagesList) {
            messagesList.innerHTML = '';
            snapshot.forEach(doc => {
                const message = doc.data();
                const messageElement = createMessageElement(message);
                messagesList.appendChild(messageElement);
            });
        }
    } catch (error) {
        console.error('Error loading messages:', error);
        showError('Failed to load messages');
    }
}

// Function to create message elements
function createMessageElement(message) {
    const div = document.createElement('div');
    div.className = 'message-item';
    if (!message.read) div.classList.add('unread');
    
    div.innerHTML = `
        <div class="message-icon">
            <i class="fas fa-envelope"></i>
        </div>
        <div class="message-content">
            <div class="message-text">${message.content}</div>
            <div class="message-time">${new Date(message.timestamp).toLocaleString()}</div>
        </div>
    `;
    return div;
}

// Add this function for sending messages
async function sendMessage(recipientType, content) {
    if (!auth.currentUser) return;
    
    try {
        await db.collection('messages').add({
            senderId: auth.currentUser.uid,
            recipientType: recipientType,
            content: content,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        });
        
        showSuccess('Message sent successfully');
    } catch (error) {
        console.error('Error sending message:', error);
        showError('Failed to send message');
    }
}

