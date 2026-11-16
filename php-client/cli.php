<?php
declare(strict_types=1);

/*
 * Command-line client.
 *   php cli.php "Good morning, my friend"
 *   php cli.php --latin "See you tomorrow"
 */
require __DIR__ . '/DarijaClient.php';

$args = array_slice($argv, 1);
$script = 'arabic';
if (($i = array_search('--latin', $args, true)) !== false) {
    $script = 'latin';
    unset($args[$i]);
}
$text = trim(implode(' ', $args));
if ($text === '') {
    fwrite(STDERR, "Usage: php cli.php [--latin] \"text to translate\"\n");
    exit(2);
}

try {
    $result = DarijaClient::fromEnv()->translate($text, 'auto', $script);
    echo $result['translation'], PHP_EOL;
} catch (RuntimeException $e) {
    fwrite(STDERR, 'Error: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
