# 학생 영어 말하기 피드백 앱

학생이 말한 영어 단어/문장을 브라우저 음성인식으로 받아 적고, 목표 문장과 비교해서 간단한 피드백을 보여주는 React + Vite 앱입니다.

## 1. 설치
터미널에서 아래 명령어를 입력하세요.

```bash
npm install
```

## 2. 실행
```bash
npm run dev
```

브라우저에서 표시되는 주소를 열면 됩니다.

## 3. GitHub에 올리는 방법
1. GitHub에서 새 저장소를 만듭니다.
2. 이 파일들을 모두 업로드합니다.
3. 커밋합니다.

## 4. Vercel 배포 방법
1. Vercel에 로그인합니다.
2. GitHub 저장소를 연결합니다.
3. `Import Project`를 누릅니다.
4. Framework Preset이 Vite로 잡히면 그대로 배포합니다.
5. `Deploy`를 누르면 웹주소가 생깁니다.

## 5. 문장 바꾸는 방법
앱 화면에서 `문항 목록 수정` 칸에
한 줄에 문장 하나씩 넣으면 됩니다.

예:
- apple
- I like apples.
- There is a cat on the chair.

## 6. 주의
- 음성인식은 Chrome 또는 Edge에서 더 잘 됩니다.
- 영어 음성인식은 브라우저 환경에 따라 정확도가 달라질 수 있습니다.
- 현재 버전은 기본 비교형 앱입니다. 나중에 점수 규칙, 발음 피드백, 학생별 기록 저장 기능을 추가할 수 있습니다.

## 7. Google Sheets에 기록 저장하기
이 프로젝트에는 `google-apps-script` 폴더가 포함되어 있습니다.

### 필요한 것
- Google 계정
- Google Sheets 파일 1개
- Google Apps Script 웹앱 URL
- Vercel 또는 다른 웹 배포 주소
- Google Sites 편집 권한

설정 방법은 `google-apps-script/README-APPS-SCRIPT.md` 파일을 보면 됩니다.

