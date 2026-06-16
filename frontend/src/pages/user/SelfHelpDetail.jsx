import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, Star, Heart } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import Sidebar from '../../components/common/Sidebar'

const ALL_ARTICLES = {
  'managing-anxiety': {
    title: 'Managing Anxiety',
    category: 'Anxiety',
    time: '5 min read',
    rating: 4.8,
    color: 'bg-blue-50 text-blue-600',
    content: `
      Anxiety is one of the most common mental health challenges people face today. 
      The good news is that there are many proven strategies to help manage it effectively.

      ## Understanding Anxiety
      Anxiety is your body's natural response to stress. It's a feeling of fear or apprehension 
      about what's to come. While occasional anxiety is normal, persistent anxiety can interfere 
      with daily activities.

      ## 10 Proven Strategies

      **1. Deep Breathing**
      Practice the 4-7-8 breathing technique: inhale for 4 counts, hold for 7, exhale for 8. 
      This activates your parasympathetic nervous system and reduces anxiety.

      **2. Regular Exercise**
      Physical activity releases endorphins — natural mood elevators. Even a 30-minute walk 
      daily can significantly reduce anxiety levels.

      **3. Limit Caffeine and Alcohol**
      Both can trigger or worsen anxiety symptoms. Try switching to herbal teas and 
      staying hydrated with water.

      **4. Practice Mindfulness**
      Mindfulness meditation helps you stay present and reduces overthinking. 
      Start with just 5 minutes a day using apps like Headspace or Calm.

      **5. Get Quality Sleep**
      Sleep deprivation amplifies anxiety. Aim for 7-9 hours per night and 
      maintain a consistent sleep schedule.

      **6. Challenge Negative Thoughts**
      When anxious thoughts arise, ask yourself: "Is this thought realistic? 
      What evidence do I have for and against it?"

      **7. Connect with Others**
      Social support is crucial. Talk to trusted friends or family about your feelings. 
      You don't have to face anxiety alone.

      **8. Set Boundaries**
      Learn to say no to things that overwhelm you. Protecting your energy is not selfish — 
      it's necessary for mental health.

      **9. Journaling**
      Write down your worries. This externalizes them and often reduces their power over you. 
      Try writing 3 things you're grateful for each day.

      **10. Seek Professional Help**
      If anxiety significantly impacts your life, therapy — especially Cognitive Behavioral 
      Therapy (CBT) — is highly effective. Consider speaking with one of our therapists.

      ## When to Seek Help
      If anxiety interferes with your daily functioning for more than 6 months, 
      please consult a mental health professional. Our verified therapists are here to help.
    `
  },
  'breathing-techniques': {
    title: 'Breathing Techniques',
    category: 'Anxiety',
    time: '3 min read',
    rating: 4.9,
    color: 'bg-blue-50 text-blue-600',
    content: `
      ## Simple Breathing Exercises for Calm

      Breathing exercises are one of the fastest ways to calm your nervous system. 
      Here are the most effective techniques:

      **Box Breathing (4-4-4-4)**
      Used by Navy SEALs to stay calm under pressure:
      - Inhale for 4 counts
      - Hold for 4 counts  
      - Exhale for 4 counts
      - Hold for 4 counts
      - Repeat 4 times

      **4-7-8 Breathing**
      Great for anxiety and sleep:
      - Inhale through nose for 4 counts
      - Hold breath for 7 counts
      - Exhale through mouth for 8 counts
      - Repeat 3-4 cycles

      **Diaphragmatic Breathing**
      Place one hand on chest, one on belly. 
      Breathe so only the belly hand moves. 
      Practice for 5-10 minutes daily.

      Practice these techniques daily for best results.
    `
  },
  'meditation-beginners': {
    title: 'Meditation for Beginners',
    category: 'Depression',
    time: '8 min read',
    rating: 4.7,
    color: 'bg-purple-50 text-purple-600',
    content: `
      ## Getting Started with Meditation

      Meditation doesn't require special equipment or hours of practice. 
      Here's how to start your meditation journey:

      **Week 1: Just Breathe (5 minutes)**
      Sit comfortably, close your eyes, and focus only on your breath. 
      When your mind wanders, gently bring it back. That's it!

      **Week 2: Body Scan (10 minutes)**
      Slowly move your attention from your toes to the top of your head, 
      noticing any sensations without judgment.

      **Week 3: Loving Kindness (15 minutes)**
      Silently repeat: "May I be happy. May I be healthy. May I be at peace." 
      Then extend these wishes to others.

      **Tips for Beginners**
      - Same time every day builds habit
      - Morning meditation sets a positive tone
      - Don't judge your "wandering mind" — it's normal
      - Apps like Headspace, Calm, or Insight Timer help
      - Start small: even 2 minutes counts

      Research shows that 8 weeks of regular meditation can measurably 
      change brain structure, improving focus and reducing anxiety.
    `
  },
  'sleep-better': {
    title: 'Sleep Better',
    category: 'Sleep',
    time: '7 min read',
    rating: 4.9,
    color: 'bg-indigo-50 text-indigo-600',
    content: `
      ## Tips for Better Sleep

      Quality sleep is foundational to mental health. Here's how to improve yours:

      **Create a Sleep Schedule**
      Go to bed and wake up at the same time every day — even weekends. 
      This regulates your circadian rhythm.

      **Optimize Your Sleep Environment**
      - Keep room cool (18-20°C is ideal)
      - Use blackout curtains
      - White noise machine or earplugs if needed
      - Reserve bed only for sleep

      **Wind-Down Routine**
      Start 1 hour before bed:
      - Dim lights
      - No screens (blue light blocks melatonin)
      - Read a physical book
      - Light stretching or yoga
      - Herbal tea (chamomile, valerian)

      **Foods That Help Sleep**
      - Tart cherry juice (natural melatonin)
      - Warm milk (tryptophan)
      - Bananas (magnesium)
      - Almonds

      **Foods to Avoid**
      - Caffeine after 2 PM
      - Heavy meals within 3 hours of bed
      - Alcohol (disrupts sleep cycles)

      If you struggle with sleep despite these measures, consider speaking 
      with one of our therapists about underlying anxiety or depression.
    `
  },
  'stress-management': {
    title: 'Stress Management',
    category: 'Stress',
    time: '6 min read',
    rating: 4.8,
    color: 'bg-green-50 text-green-600',
    content: `
      ## Practical Stress Reduction Techniques

      Stress is inevitable, but how you respond to it makes all the difference.

      **Identify Your Stressors**
      Keep a stress journal for one week. Note:
      - What triggered the stress?
      - How did you react?
      - What helped?

      **The 4 A's of Stress Management**

      **Avoid** unnecessary stress:
      - Learn to say no
      - Avoid people who stress you out
      - Take control of your environment

      **Alter** the situation:
      - Express feelings instead of bottling up
      - Be willing to compromise
      - Create a balanced schedule

      **Adapt** to the stressor:
      - Reframe problems as opportunities
      - Look at the big picture
      - Adjust your standards

      **Accept** what you can't change:
      - Don't try to control the uncontrollable
      - Look for the upside
      - Share your feelings

      **Quick Stress Busters**
      - 5-minute walk outside
      - Progressive muscle relaxation
      - Call a friend
      - Listen to music
      - Laugh — watch a funny video

      Remember: chronic stress is a medical issue. Our therapists can help 
      you develop personalized stress management strategies.
    `
  },
}

export default function SelfHelpDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const article = ALL_ARTICLES[slug]

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar role={user?.role || 'user'} />
        <div className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Article not found</h2>
            <button onClick={() => navigate('/self-help')} className="btn-primary">
              Back to Resources
            </button>
          </div>
        </div>
      </div>
    )
  }

  const formatContent = (content) => {
    return content.split('\n').map((line, i) => {
      line = line.trim()
      if (!line) return null
      if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-gray-900 mt-6 mb-3">{line.replace('## ', '')}</h2>
      if (line.startsWith('**') && line.endsWith('**')) return <h3 key={i} className="font-bold text-gray-800 mt-4 mb-2">{line.replace(/\*\*/g, '')}</h3>
      if (line.startsWith('- ')) return <li key={i} className="text-gray-600 ml-4 mb-1">{line.replace('- ', '')}</li>
      return <p key={i} className="text-gray-600 mb-3 leading-relaxed">{line}</p>
    }).filter(Boolean)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role={user?.role || 'user'} />

      <div className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/self-help')} className="p-2 hover:bg-gray-100 rounded-lg ml-10 lg:ml-0">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Self Help Resources</h1>
          </div>
        </header>

        <div className="p-4 lg:p-8 max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:p-8 shadow-sm">

            {/* Article Header */}
            <div className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full border mb-4 ${article.color} border-current border-opacity-20`}>
              {article.category}
            </div>

            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">{article.title}</h1>

            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
              <span className="flex items-center gap-1 text-gray-500 text-sm">
                <Clock className="w-4 h-4" />{article.time}
              </span>
              <span className="flex items-center gap-1 text-gray-500 text-sm">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />{article.rating}
              </span>
              <span className="flex items-center gap-1 text-gray-500 text-sm">
                <Heart className="w-4 h-4 text-red-400" />Save
              </span>
            </div>

            {/* Content */}
            <div className="prose max-w-none">
              {formatContent(article.content)}
            </div>

            {/* CTA */}
            <div className="mt-8 p-5 bg-primary-50 rounded-2xl border border-primary-100">
              <h3 className="font-semibold text-gray-900 mb-2">Need Professional Support?</h3>
              <p className="text-gray-600 text-sm mb-4">
                Our verified therapists are here to help you with personalized guidance.
              </p>
              <button
                onClick={() => navigate('/therapists')}
                className="btn-primary text-sm py-2 px-4"
              >
                Find a Therapist
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}