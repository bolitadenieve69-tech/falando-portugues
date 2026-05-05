import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius, Colors, Spacing, Typography } from '../../../constants/theme';
import type { UserLevel } from '../../session/types';

const WARM_RED = '#D53244';
const WARM_GREEN = '#046A38';

type Answer = 0 | 1 | 2 | 3;

interface Question {
  prompt: string;
  answers: { label: string; value: Answer }[];
}

const QUESTIONS: Question[] = [
  {
    prompt: 'Quando ouves português europeu natural, consegues acompanhar?',
    answers: [
      { label: 'Só palavras soltas', value: 0 },
      { label: 'Frases simples', value: 1 },
      { label: 'A maior parte', value: 2 },
      { label: 'Quase tudo', value: 3 },
    ],
  },
  {
    prompt: 'Como falas numa conversa sem preparar?',
    answers: [
      { label: 'Com palavras básicas', value: 0 },
      { label: 'Com frases curtas', value: 1 },
      { label: 'Com alguma fluidez', value: 2 },
      { label: 'Com naturalidade', value: 3 },
    ],
  },
  {
    prompt: 'Que tipo de erros queres corrigir?',
    answers: [
      { label: 'Pronúncia e frases básicas', value: 0 },
      { label: 'Tempos verbais comuns', value: 1 },
      { label: 'Expressões e precisão', value: 2 },
      { label: 'Estilo e nuance', value: 3 },
    ],
  },
  {
    prompt: 'Consegues explicar uma opinião em português?',
    answers: [
      { label: 'Ainda não', value: 0 },
      { label: 'Com ajuda', value: 1 },
      { label: 'Sim, em temas conhecidos', value: 2 },
      { label: 'Sim, mesmo em temas difíceis', value: 3 },
    ],
  },
];

function recommendedLevel(score: number): UserLevel {
  if (score <= 1) return 'A1';
  if (score <= 3) return 'A2';
  if (score <= 5) return 'B1';
  if (score <= 7) return 'B2';
  if (score <= 9) return 'C1';
  return 'C2';
}

interface Props {
  currentLevel: UserLevel;
  onApplyLevel: (level: UserLevel) => void;
}

export function LevelAssessmentCard({ currentLevel, onApplyLevel }: Props) {
  const [visible, setVisible] = useState(false);
  const [answers, setAnswers] = useState<(Answer | null)[]>(
    Array.from({ length: QUESTIONS.length }, () => null),
  );

  const score = useMemo(
    () => answers.reduce<number>((sum, value) => sum + (value ?? 0), 0),
    [answers],
  );
  const result = recommendedLevel(score);
  const complete = answers.every((answer) => answer != null);

  function resetAndOpen() {
    setAnswers(Array.from({ length: QUESTIONS.length }, () => null));
    setVisible(true);
  }

  function applyResult() {
    if (!complete) return;
    onApplyLevel(result);
    setVisible(false);
  }

  return (
    <>
      <TouchableOpacity style={styles.card} activeOpacity={0.82} onPress={resetAndOpen}>
        <View style={styles.cardStripe} />
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="school-outline" size={24} color={Colors.primary} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.title}>Descobrir o meu nível</Text>
          <Text style={styles.subtitle}>Atual: {currentLevel} · recomendação simples e ajustável</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.onSurface + '55'} />
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setVisible(false)} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.onSurface} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>O teu ponto de partida</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            style={styles.questionScroll}
            contentContainerStyle={styles.questions}
            showsVerticalScrollIndicator={false}
          >
            {QUESTIONS.map((question, index) => (
              <View key={question.prompt} style={styles.questionBlock}>
                <Text style={styles.question}>{question.prompt}</Text>
                <View style={styles.answerGrid}>
                  {question.answers.map((answer) => {
                    const selected = answers[index] === answer.value;
                    return (
                      <Pressable
                        key={answer.label}
                        style={[styles.answer, selected && styles.answerSelected]}
                        onPress={() =>
                          setAnswers((prev) =>
                            prev.map((value, i) => (i === index ? answer.value : value)),
                          )
                        }
                      >
                        <Text style={[styles.answerText, selected && styles.answerTextSelected]}>
                          {answer.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.resultBar}>
            <View>
              <Text style={styles.resultLabel}>Nível recomendado</Text>
              <Text style={styles.resultLevel}>{complete ? result : '--'}</Text>
              <Text style={styles.resultHint}>Podes mudar isto depois.</Text>
            </View>
            <TouchableOpacity
              style={[styles.applyButton, !complete && styles.applyButtonDisabled]}
              disabled={!complete}
              onPress={applyResult}
            >
              <Text style={styles.applyButtonText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.secondary + '22',
    overflow: 'hidden',
  },
  cardStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: WARM_RED,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WARM_GREEN,
  },
  cardText: { flex: 1 },
  title: {
    fontFamily: Typography.headlineBold,
    fontSize: 15,
    color: Colors.onSurface,
  },
  subtitle: {
    fontFamily: Typography.label,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontFamily: Typography.headlineBold,
    fontSize: 20,
    color: Colors.onSurface,
  },
  questions: { gap: Spacing.lg },
  questionScroll: { flex: 1 },
  questionBlock: { gap: Spacing.sm },
  question: {
    fontFamily: Typography.headlineBold,
    fontSize: 15,
    color: Colors.onSurface,
    lineHeight: 22,
  },
  answerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  answer: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '44',
  },
  answerSelected: {
    backgroundColor: WARM_GREEN,
    borderColor: Colors.primary,
  },
  answerText: {
    fontFamily: Typography.labelMedium,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  answerTextSelected: { color: Colors.onPrimary },
  resultBar: {
    marginTop: 'auto',
    marginBottom: Spacing.xl,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.secondary + '22',
  },
  resultLabel: {
    fontFamily: Typography.label,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  resultLevel: {
    fontFamily: Typography.headline,
    fontSize: 34,
    lineHeight: 38,
    color: Colors.primary,
  },
  resultHint: {
    fontFamily: Typography.label,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  applyButton: {
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  applyButtonDisabled: { opacity: 0.35 },
  applyButtonText: {
    fontFamily: Typography.headlineBold,
    fontSize: 14,
    color: Colors.onPrimary,
  },
});
