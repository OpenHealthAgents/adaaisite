const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const yearNode = document.getElementById('year');

if (yearNode) {
  yearNode.textContent = String(new Date().getFullYear());
}

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll('.reveal').forEach((node) => observer.observe(node));

const chatbotToggle = document.getElementById('chatbot-toggle');
const chatbotPanel = document.getElementById('chatbot-panel');
const chatbotClose = document.getElementById('chatbot-close');
const chatbotMessages = document.getElementById('chatbot-messages');
const chatbotForm = document.getElementById('chatbot-form');
const chatbotInput = document.getElementById('chatbot-input');

const leadQuestions = [
  { key: 'name', prompt: 'What is your full name?' },
  { key: 'email', prompt: 'What is your email address?' },
  { key: 'phone', prompt: 'What is your phone number with country code?' },
  { key: 'company', prompt: 'What is your company or organization name?' },
  { key: 'service', prompt: 'Which service do you need from Ada AI?' },
  { key: 'details', prompt: 'Share a short description of your project requirements.' }
];

const leadData = {};
let stepIndex = 0;
let isStarted = false;
let isSubmitting = false;

function addMessage(text, role) {
  if (!chatbotMessages) return;
  const message = document.createElement('p');
  message.className = `message ${role}`;
  message.textContent = text;
  chatbotMessages.appendChild(message);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function askCurrentQuestion() {
  if (stepIndex < leadQuestions.length) {
    addMessage(leadQuestions[stepIndex].prompt, 'bot');
  }
}

function startChat() {
  if (isStarted) return;
  addMessage('Hi, I am the Ada AI assistant. I can capture your project lead in under a minute.', 'bot');
  askCurrentQuestion();
  isStarted = true;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
  return /^[+()\-\s\d]{7,20}$/.test(value);
}

function validateAnswer(answer, key) {
  if (!answer) return 'Please enter a response.';
  if (key === 'email' && !isValidEmail(answer)) return 'Please enter a valid email address.';
  if (key === 'phone' && !isValidPhone(answer)) return 'Please enter a valid phone number.';
  return '';
}

async function submitLead() {
  if (isSubmitting) return;
  isSubmitting = true;

  addMessage('Submitting your details now...', 'bot');

  try {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData)
    });

    if (!response.ok) {
      throw new Error('Submission failed');
    }

    addMessage('Thank you. Your request has been received. Our team will contact you at contact@adaai.in or +91 93463 17790.', 'bot');
  } catch (error) {
    addMessage('There was an issue saving your request. Please email us at contact@adaai.in.', 'bot');
  } finally {
    isSubmitting = false;
    chatbotInput.value = '';
    chatbotInput.disabled = true;
    chatbotForm.querySelector('button').disabled = true;
  }
}

if (chatbotToggle && chatbotPanel && chatbotForm && chatbotInput) {
  const setChatOpen = (open) => {
    chatbotPanel.classList.toggle('open', open);
    chatbotToggle.setAttribute('aria-expanded', String(open));
    if (open) {
      startChat();
      chatbotInput.focus();
    }
  };

  chatbotToggle.addEventListener('click', () => {
    const open = !chatbotPanel.classList.contains('open');
    setChatOpen(open);
  });

  if (chatbotClose) {
    chatbotClose.addEventListener('click', () => setChatOpen(false));
  }

  chatbotForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting || stepIndex >= leadQuestions.length) return;

    const answer = chatbotInput.value.trim();
    const question = leadQuestions[stepIndex];
    const validationMessage = validateAnswer(answer, question.key);

    if (validationMessage) {
      addMessage(validationMessage, 'bot');
      return;
    }

    addMessage(answer, 'user');
    leadData[question.key] = answer;
    stepIndex += 1;
    chatbotInput.value = '';

    if (stepIndex < leadQuestions.length) {
      askCurrentQuestion();
      return;
    }

    await submitLead();
  });
}
