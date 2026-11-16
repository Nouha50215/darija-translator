<?php
declare(strict_types=1);

/*
 * Web front-end for the Darija Translator API.
 * Run:  php -S localhost:8000 -t php-client
 * Then open http://localhost:8000
 */
require __DIR__ . '/DarijaClient.php';

$client = DarijaClient::fromEnv();

$text   = trim((string) ($_POST['text'] ?? ''));
$source = (string) ($_POST['source'] ?? 'auto');
$script = ($_POST['script'] ?? 'arabic') === 'latin' ? 'latin' : 'arabic';
$result = null;
$error  = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($text === '') {
        $error = 'Please enter some text to translate.';
    } else {
        try {
            $result = $client->translate($text, $source, $script);
        } catch (RuntimeException $e) {
            $error = $e->getMessage();
        }
    }
}

try {
    $health = $client->health();
    $serverInfo = 'Server up · ' . $health['provider'] . ' / ' . $health['model'];
    $serverUp = true;
} catch (RuntimeException $e) {
    $serverInfo = 'Server unreachable';
    $serverUp = false;
}

function e(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

$languages = [
    'auto' => 'Detect language', 'English' => 'English', 'French' => 'French',
    'Spanish' => 'Spanish', 'Modern Standard Arabic' => 'Standard Arabic', 'German' => 'German',
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Darija Translator · PHP client</title>
    <style>
        :root { --red:#c1272d; --green:#006233; }
        body { font: 16px/1.5 system-ui, sans-serif; background:#f7f5f2; margin:0; color:#1f1f1f; }
        header { background:var(--red); color:#fff; padding:16px 24px; display:flex; justify-content:space-between; align-items:center; }
        header h1 { margin:0; font-size:20px; }
        .dot { font-size:13px; } .up { color:#9ef0bf; } .down { color:#ffd0d0; }
        main { max-width:760px; margin:24px auto; padding:0 16px; }
        form, .result { background:#fff; border:1px solid #e3ded7; border-radius:12px; padding:16px; margin-bottom:16px; }
        textarea { width:100%; box-sizing:border-box; min-height:120px; font:inherit; padding:10px; border:1px solid #e3ded7; border-radius:8px; }
        .row { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-top:12px; }
        select, button { font:inherit; padding:8px 12px; border-radius:8px; border:1px solid #e3ded7; }
        button { background:var(--green); color:#fff; border-color:var(--green); font-weight:600; cursor:pointer; margin-left:auto; }
        .translation { font-size:22px; line-height:1.8; white-space:pre-wrap; }
        .meta { color:#6b6b6b; font-size:12px; }
        .error { background:#fde8e8; color:#8a1c1c; padding:10px 14px; border-radius:8px; margin-bottom:16px; }
    </style>
</head>
<body>
<header>
    <h1>Darija Translator <small style="font-weight:400">· PHP client</small></h1>
    <span class="dot <?= $serverUp ? 'up' : 'down' ?>">● <?= e($serverInfo) ?></span>
</header>
<main>
    <?php if ($error): ?>
        <div class="error"><?= e($error) ?></div>
    <?php endif; ?>

    <form method="post">
        <textarea name="text" placeholder="Type text in any language…" required><?= e($text) ?></textarea>
        <div class="row">
            <label>From
                <select name="source">
                    <?php foreach ($languages as $value => $label): ?>
                        <option value="<?= e($value) ?>" <?= $value === $source ? 'selected' : '' ?>><?= e($label) ?></option>
                    <?php endforeach; ?>
                </select>
            </label>
            <label><input type="radio" name="script" value="arabic" <?= $script === 'arabic' ? 'checked' : '' ?>> Arabic script</label>
            <label><input type="radio" name="script" value="latin" <?= $script === 'latin' ? 'checked' : '' ?>> 3arabizi</label>
            <button type="submit">Translate</button>
        </div>
    </form>

    <?php if ($result): ?>
        <div class="result">
            <div class="translation" dir="<?= $result['script'] === 'arabic' ? 'rtl' : 'ltr' ?>"><?= e((string) $result['translation']) ?></div>
            <p class="meta"><?= e("{$result['provider']} · {$result['model']} · {$result['durationMs']} ms") ?></p>
        </div>
    <?php endif; ?>
</main>
</body>
</html>
