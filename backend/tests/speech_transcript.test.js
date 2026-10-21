// speech_transcript.test.js
// Unit test verifying the speech-to-text transcript accumulation logic
// matching Phase 3 requirements.

function appendSpeechTranscript(baseText = '', finalSegment = '', interimSegment = '') {
  const parts = [];
  const cleanBase = (baseText || '').trim();
  const cleanFinal = (finalSegment || '').trim();
  const cleanInterim = (interimSegment || '').trim();

  if (cleanBase) parts.push(cleanBase);
  if (cleanFinal) parts.push(cleanFinal);
  if (cleanInterim) parts.push(cleanInterim);

  return parts.join(' ');
}

describe('Phase 3 — Speech-to-Text Transcript Appending Logic', () => {
  test('Preserves pre-existing typed text when voice recognition starts', () => {
    const typedText = 'I spent';
    const firstSpokenFinal = '₹50 on tea today';
    const interim = '';

    const result = appendSpeechTranscript(typedText, firstSpokenFinal, interim);
    expect(result).toBe('I spent ₹50 on tea today');
  });

  test('Appends speech segments across multiple pauses without replacing earlier words', () => {
    // 1. User starts speaking: "Add my salary"
    let base = '';
    let speech1 = appendSpeechTranscript(base, 'Add my salary of', '');
    expect(speech1).toBe('Add my salary of');

    // 2. User pauses (mic stops, base is updated to current input)
    base = speech1;

    // 3. User taps mic again and resumes: "₹10,000 for this month"
    let speech2 = appendSpeechTranscript(base, '₹10,000 for this month', '');
    expect(speech2).toBe('Add my salary of ₹10,000 for this month');

    // 4. User pauses again
    base = speech2;

    // 5. User resumes: "please"
    let speech3 = appendSpeechTranscript(base, 'please', '');
    expect(speech3).toBe('Add my salary of ₹10,000 for this month please');
  });

  test('Correctly handles interim results without duplicating finalized text', () => {
    const base = 'I spent ₹50 on tea';
    // Interim while user is still speaking "and biscuits"
    const withInterim = appendSpeechTranscript(base, '', 'and biscuits');
    expect(withInterim).toBe('I spent ₹50 on tea and biscuits');

    // Now final arrives
    const withFinal = appendSpeechTranscript(base, 'and biscuits', '');
    expect(withFinal).toBe('I spent ₹50 on tea and biscuits');
  });

  test('Preserves user manual edits between pauses', () => {
    let base = 'I spent 500';
    // User manually corrects "500" to "50 on tea"
    let manuallyEdited = 'I spent ₹50 on tea';
    base = manuallyEdited;

    // Next speech segment
    let nextSpeech = appendSpeechTranscript(base, 'via UPI', '');
    expect(nextSpeech).toBe('I spent ₹50 on tea via UPI');
  });

  test('Gracefully handles empty segments and whitespace', () => {
    expect(appendSpeechTranscript('', '', '')).toBe('');
    expect(appendSpeechTranscript('   ', '  hello  ', '   ')).toBe('hello');
    expect(appendSpeechTranscript('hello', '   ', '')).toBe('hello');
  });
});
