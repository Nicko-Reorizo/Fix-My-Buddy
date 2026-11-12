import { useLocale } from '../../context/useLocale';

const questions = [
  ['starts', 'Does it start/run?', 'Umaandar ba ang makina?'],
  ['rolls', 'Does it roll freely?', 'Malayang gumugulong ba ang sasakyan?'],
  ['collision', 'Is there collision damage?', 'May pinsala mula sa banggaan?']
];

const answers = [
  ['yes', 'Yes', 'Oo'],
  ['no', 'No', 'Hindi'],
  ['unknown', 'Not sure', 'Hindi sigurado']
];

export function TowingCondition({ value = {}, onChange }) {
  const { t } = useLocale();
  return <fieldset className="request-issues towing-condition">
    <legend>{t('Vehicle condition','Kondisyon ng sasakyan')}</legend>
    {questions.map(([key, en, fil]) => <fieldset key={key} className="towing-question">
      <legend>{t(en, fil)}</legend>
      <div className="towing-choice">
        {answers.map(([answer, answerEn, answerFil]) => <button
          key={answer}
          type="button"
          className="provider-chip"
          aria-pressed={value[key] === answer}
          onClick={() => onChange({ ...value, [key]: answer })}
        >{t(answerEn, answerFil)}</button>)}
      </div>
    </fieldset>)}
  </fieldset>;
}