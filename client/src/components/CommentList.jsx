import { useState, useRef } from 'react';
import { useMutation } from '@apollo/client';
import {
  Box,
  Button,
  Flex,
  Avatar,
  Text,
  IconButton,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverHeader,
  PopoverBody,
  Input,
  useToast,
  ButtonGroup,
  useOutsideClick,
} from '@chakra-ui/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsis } from '@fortawesome/free-solid-svg-icons';
import { REMOVE_COMMENT, EDIT_COMMENT } from '../utils/mutations';
import { QUERY_RIDES } from '../utils/queries';
import Auth from '../utils/auth';

// CommentList component to display and manage comments for a ride
const CommentList = ({ comments = [], rideId }) => {
  // State for edit mode and text for editing comments
  const [editMode, setEditMode] = useState(null);
  const [editText, setEditText] = useState('');
  const toast = useToast(); // Toast for notifications
  const [isPopoverOpen, setIsPopoverOpen] = useState(null); // State for popover open status
  const popoverRef = useRef(); // Ref for popover content

  // Close the popover when clicking outside of it
  useOutsideClick({
    ref: popoverRef,
    handler: () => setIsPopoverOpen(null),
  });

  // GraphQL mutation to remove a comment
  const [removeComment] = useMutation(REMOVE_COMMENT, {
    refetchQueries: [{ query: QUERY_RIDES }],
  });

  // GraphQL mutation to edit a comment
  const [editComment] = useMutation(EDIT_COMMENT, {
    refetchQueries: [{ query: QUERY_RIDES }],
  });

  // Handler to edit a comment
  const handleEditComment = async (commentId) => {
    try {
      await editComment({
        variables: { rideId, commentId, commentText: editText },
      });
      setEditMode(null); // Exit edit mode
      setEditText(''); // Clear edit text
      toast({
        title: 'Comment updated successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Handler to remove a comment
  const handleRemoveComment = async (commentId) => {
    try {
      await removeComment({ variables: { rideId, commentId } });
    } catch (err) {
      console.error(err);
    }
  };

  // Get the current logged-in user's username
  const currentUser = Auth.loggedIn() ? Auth.getProfile().data.username : null;

  // Editable controls for editing and saving comments
  const EditableControls = ({ comment }) => {
    const isEditing = editMode === comment._id;

    return isEditing ? (
      <ButtonGroup justifyContent='center' size='sm'>
        <Button
          size='sm'
          colorScheme='blue'
          onClick={() => handleEditComment(comment._id)}
        >
          Save
        </Button>
        <Button
          size='sm'
          colorScheme='red'
          onClick={() => {
            setEditMode(null);
            setEditText('');
          }}
        >
          Cancel
        </Button>
      </ButtonGroup>
    ) : (
      <Flex justifyContent='center'>
        <Button
          size='sm'
          colorScheme='green'
          onClick={() => {
            setEditMode(comment._id);
            setEditText(comment.commentText);
          }}
        >
          Edit
        </Button>
      </Flex>
    );
  };

  // Render message if there are no comments
  if (!comments.length) {
    return (
      <Box>
        <Text fontSize='sm' mt={4} ml={1}>
          No Comments Yet
        </Text>
      </Box>
    );
  }

  return (
    <Box mt={4}>
      {comments
        .slice() // Copy comments array
        .reverse() // Reverse order to show newest comments first
        .map((comment) => (
          <Box
            key={comment._id}
            p={4}
            mt={4}
            borderWidth='1px'
            borderRadius='3xl'
            borderColor='gray.300'
            overflow='visible'
            position='relative'
          >
            {Auth.loggedIn() && currentUser === comment.commentAuthor && (
              <Popover
                isOpen={isPopoverOpen === comment._id}
                onClose={() => setIsPopoverOpen(null)}
                initialFocusRef={popoverRef}
                placement='bottom-end'
              >
                <PopoverTrigger>
                  <IconButton
                    icon={<FontAwesomeIcon icon={faEllipsis} />}
                    variant='ghost'
                    size='sm'
                    position='absolute'
                    top='8px'
                    right='8px'
                    onClick={() => setIsPopoverOpen(comment._id)}
                  />
                </PopoverTrigger>
                <PopoverContent ref={popoverRef} width='fit-content'>
                  <PopoverArrow />
                  <PopoverHeader fontSize='sm'>Manage Comment</PopoverHeader>
                  <PopoverBody>
                    {editMode === comment._id ? (
                      <Box>
                        <Button
                          width='100%'
                          colorScheme='blue'
                          size='sm'
                          rounded='full'
                          onClick={() => handleEditComment(comment._id)}
                        >
                          Save
                        </Button>
                      </Box>
                    ) : (
                      <Button
                        width='100%'
                        colorScheme='green'
                        size='sm'
                        rounded='full'
                        onClick={() => {
                          setEditMode(comment._id);
                          setEditText(comment.commentText);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </PopoverBody>
                  <PopoverBody>
                    <Button
                      width='100%'
                      colorScheme='red'
                      size='sm'
                      rounded='full'
                      onClick={() => handleRemoveComment(comment._id)}
                    >
                      Remove
                    </Button>
                  </PopoverBody>
                </PopoverContent>
              </Popover>
            )}
            <Flex alignItems='center'>
              <Box flex='1'>
                <Flex alignItems='center'>
                  <Avatar name={comment.commentAuthor} size='xs' mr={2} />
                  <Box>
                    <Text
                      fontWeight='bold'
                      fontSize='sm'
                      mr={1}
                      color='gray.600'
                    >
                      {comment.commentAuthor}
                    </Text>
                    <Text fontSize='xs' color='gray.400'>
                      {comment.createdAt}
                    </Text>
                  </Box>
                </Flex>
                {editMode === comment._id ? (
                  <Input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    mt='1'
                    wordBreak='break-word'
                    lineHeight='1.3'
                    fontSize='sm'
                    maxWidth='90%'
                  />
                ) : (
                  <Text
                    mt='1'
                    wordBreak='break-word'
                    lineHeight='1.3'
                    fontSize='sm'
                  >
                    {comment.commentText}
                  </Text>
                )}
              </Box>
            </Flex>
          </Box>
        ))}
    </Box>
  );
};

export default CommentList;
